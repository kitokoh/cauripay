/**
 * POST /api/auth/logout — termine la session web-admin (cookie supprimé) puis
 * redirige vers end_session_endpoint Keycloak (déconnexion SSO).
 */
import { NextResponse, type NextRequest } from 'next/server';
import {
  OAUTH_STATE_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  clearSessionCookieOptions,
} from '../../../../lib/auth/session';
import { getEndSessionUrl } from '../../../../lib/auth/oidc';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const localLogout = NextResponse.redirect(new URL('/login', request.nextUrl.origin));
  localLogout.cookies.set(SESSION_COOKIE_NAME, '', clearSessionCookieOptions());
  localLogout.cookies.set(OAUTH_STATE_COOKIE_NAME, '', clearSessionCookieOptions());

  try {
    const postLogoutRedirectUri = new URL('/login', request.nextUrl.origin).toString();
    const endSessionUrl = await getEndSessionUrl(postLogoutRedirectUri);
    if (!endSessionUrl) return localLogout; // fournisseur sans end_session_endpoint
    const ssoLogout = NextResponse.redirect(endSessionUrl);
    // On efface les cookies locaux même sur la redirection SSO.
    ssoLogout.cookies.set(SESSION_COOKIE_NAME, '', clearSessionCookieOptions());
    ssoLogout.cookies.set(OAUTH_STATE_COOKIE_NAME, '', clearSessionCookieOptions());
    return ssoLogout;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('web-admin: déconnexion SSO échouée (cookie local effacé)', error);
    return localLogout;
  }
}
