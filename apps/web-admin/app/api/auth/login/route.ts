/**
 * GET /api/auth/login — démarre le flux OIDC : génère state+nonce, les signe
 * dans un cookie court, puis redirige vers l'URL d'autorisation Keycloak.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { OAUTH_STATE_COOKIE_NAME, signOAuthState } from '../../../../lib/auth/session';
import { buildAuthorizationUrl, generateStateAndNonce } from '../../../../lib/auth/oidc';
import { isProduction } from '../../../../lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { state, nonce } = generateStateAndNonce();
  const stateToken = await signOAuthState(state, nonce);

  const redirectUri = new URL('/api/auth/callback', request.nextUrl.origin).toString();
  const authorizationUrl = await buildAuthorizationUrl({ state, nonce, redirectUri });

  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set(OAUTH_STATE_COOKIE_NAME, stateToken, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction(),
    maxAge: 10 * 60, // 10 min
  });
  return response;
}
