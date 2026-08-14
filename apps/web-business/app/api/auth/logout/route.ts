/**
 * GET /api/auth/logout — déconnexion.
 * Invalide le cookie de session puis appelle l'end_session Keycloak
 * (id_token_hint) si un id_token est disponible, avec retour vers /login.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { clearSessionCookie } from '../../../../lib/auth/cookies';
import { getOidcClient, postLogoutRedirectUri } from '../../../../lib/auth/oidc';
import { readSession } from '../../../../lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await readSession(req.cookies.get('goursi_business_session')?.value);

  let res: NextResponse;
  if (session?.idToken) {
    try {
      const client = await getOidcClient();
      const endSessionUrl = client.endSessionUrl({
        id_token_hint: session.idToken,
        post_logout_redirect_uri: postLogoutRedirectUri(),
      });
      res = NextResponse.redirect(endSessionUrl);
    } catch (err) {
      console.error('[auth/logout] end_session Keycloak indisponible :', err);
      res = NextResponse.redirect(new URL('/login', req.url));
    }
  } else {
    res = NextResponse.redirect(new URL('/login', req.url));
  }

  clearSessionCookie(res);
  return res;
}
