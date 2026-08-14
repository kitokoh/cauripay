/**
 * GET /api/auth/callback — retour de Keycloak après consentement.
 *
 * 1. Vérifie state (cookie signé) ;
 * 2. Échange le code contre des tokens (openid-client, vérifie nonce) ;
 * 3. Extrait les rôles de realm_access.roles ;
 * 4. Crée la session chiffrée (cookie goursi_admin_session) ;
 * 5. Redirige vers / (app/page.tsx → /dashboard).
 */
import { NextResponse, type NextRequest } from 'next/server';
import {
  AdminSession,
  OAUTH_STATE_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  encryptSession,
  sessionCookieOptions,
  verifyOAuthState,
} from '../../../../lib/auth/session';
import { exchangeCodeForSession } from '../../../../lib/auth/oidc';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const oidcError = searchParams.get('error');
  const stateToken = request.cookies.get(OAUTH_STATE_COOKIE_NAME)?.value;

  const fail = (reason: string) => {
    const response = NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(reason)}`, request.nextUrl.origin));
    response.cookies.set(OAUTH_STATE_COOKIE_NAME, '', { ...sessionCookieOptions(0) });
    return response;
  };

  if (oidcError) return fail(`oidc_error=${oidcError}`);
  if (!code || !state) return fail('code_ou_state_manquant');
  if (!stateToken) return fail('cookie_state_manquant');

  const expected = await verifyOAuthState(stateToken);
  if (!expected || expected.state !== state) return fail('state_invalide');

  try {
    const redirectUri = new URL('/api/auth/callback', request.nextUrl.origin).toString();
    const profile = await exchangeCodeForSession({
      code,
      redirectUri,
      expectedState: state,
      expectedNonce: expected.nonce,
    });

    if (!profile.sub) return fail('subject_manquant');

    const session: AdminSession = {
      sub: profile.sub,
      email: profile.email,
      name: profile.name,
      roles: profile.roles,
    };
    const token = await encryptSession(session);

    const response = NextResponse.redirect(new URL('/', request.nextUrl.origin));
    response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
    response.cookies.set(OAUTH_STATE_COOKIE_NAME, '', { ...sessionCookieOptions(0) });
    return response;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('web-admin: échange de code OIDC échoué', error);
    return fail('echange_code_echoue');
  }
}
