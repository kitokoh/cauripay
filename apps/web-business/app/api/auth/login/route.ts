/**
 * POST /api/auth/login — démarre le flux OIDC (authorization code + PKCE).
 * Génère state + code_verifier (cookies httpOnly courts), redirige vers Keycloak.
 */
import { NextResponse, type NextRequest } from 'next/server';
import {
  buildAuthorizationUrl,
  getOidcClient,
  OIDC_STATE_COOKIE,
  OIDC_VERIFIER_COOKIE,
} from '../../../../lib/auth/oidc';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest): Promise<NextResponse> {
  const client = await getOidcClient();
  const { url, state, codeVerifier } = await buildAuthorizationUrl(client);

  const res = NextResponse.redirect(url);
  // cookies courts (10 min) : le callback les consomme et les supprime
  const opts = { httpOnly: true, sameSite: 'lax' as const, path: '/', maxAge: 600 };
  res.cookies.set(OIDC_STATE_COOKIE, state, opts);
  res.cookies.set(OIDC_VERIFIER_COOKIE, codeVerifier, opts);
  return res;
}
