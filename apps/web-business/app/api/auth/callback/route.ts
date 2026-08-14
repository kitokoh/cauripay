/**
 * GET /api/auth/callback — callback OIDC Keycloak.
 *
 * 1. Validation de `state` (anti-CSRF, cookie httpOnly court).
 * 2. Échange du code contre un TokenSet (PKCE S256).
 * 3. Userinfo Keycloak → session JWT `goursi_business_session`.
 * 4. Décision 2FA :
 *    - 1er login (aucun secret TOTP enregistré) : session `pending2fa`,
 *      secret provisoire embarqué → redirection /setup-2fa (QR + enroll).
 *    - login suivant (secret enregistré) : session à valider →
 *      redirection /verify-2fa.
 *    Dans les deux cas `twoFactorVerified=false` : le middleware bloque tout
 *    le reste tant que la 2FA n'est pas validée.
 */
import { NextResponse, type NextRequest } from 'next/server';
import type { IdTokenClaims } from 'openid-client';
import { twoFactorStore } from '../../../../lib/auth/2fa-store';
import { setSessionCookie } from '../../../../lib/auth/cookies';
import { exchangeCode, getOidcClient, OIDC_STATE_COOKIE, OIDC_VERIFIER_COOKIE } from '../../../../lib/auth/oidc';
import { createSession, type SessionUser } from '../../../../lib/auth/session';
import { generateSecret } from '../../../../lib/auth/two-factor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl;

  // 1. Erreur OIDC (ex. accès refusé)
  if (searchParams.get('error')) {
    const redirect = new URL('/login?error=oidc', req.url);
    return NextResponse.redirect(redirect);
  }

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const storedState = req.cookies.get(OIDC_STATE_COOKIE)?.value;
  const codeVerifier = req.cookies.get(OIDC_VERIFIER_COOKIE)?.value;

  // 2. Garde-fous : code présent + état conforme + verifier PKCE présent
  if (!code || !state || !storedState || !codeVerifier || state !== storedState) {
    const redirect = new URL('/login?error=invalid_state', req.url);
    return NextResponse.redirect(redirect);
  }

  try {
    // 3. Échange du code (PKCE) — lève une erreur si code/state invalides
    const client = await getOidcClient();
    const tokenSet = await exchangeCode(client, { code, state }, codeVerifier);

    // 4. Identité : userinfo Keycloak (complété par les claims de l'id_token)
    const userinfo = await client.userinfo(tokenSet.access_token as string);
    const claims = tokenSet.claims() as IdTokenClaims & {
      realm_access?: { roles?: string[] };
      preferred_username?: string;
    };
    const sub = userinfo.sub ?? claims.sub;
    const email = userinfo.email ?? claims.email;
    const name = userinfo.name ?? userinfo.preferred_username ?? email;

    // 5. État 2FA de l'utilisateur
    const enrolled = twoFactorStore.isEnrolled(sub);
    const session: SessionUser = {
      sub,
      email,
      name,
      roles: Array.isArray(claims.realm_access?.roles) ? claims.realm_access.roles : [],
      idToken: tokenSet.id_token,
      twoFactorEnrolled: enrolled,
      twoFactorVerified: false,
      // 1er login : secret provisoire affiché en QR puis validé via /api/2fa/enroll
      ...(enrolled ? {} : { pending2faSecret: generateSecret() }),
    };

    const token = await createSession(session);
    const target = enrolled ? '/verify-2fa' : '/setup-2fa';

    const res = NextResponse.redirect(new URL(target, req.url));
    setSessionCookie(res, token);
    // cookies OIDC à usage unique
    res.cookies.delete(OIDC_STATE_COOKIE);
    res.cookies.delete(OIDC_VERIFIER_COOKIE);
    return res;
  } catch (err) {
    console.error('[auth/callback] échec de l\'échange OIDC :', err);
    const redirect = new URL('/login?error=oidc_exchange', req.url);
    const res = NextResponse.redirect(redirect);
    res.cookies.delete(OIDC_STATE_COOKIE);
    res.cookies.delete(OIDC_VERIFIER_COOKIE);
    return res;
  }
}
