import { NextResponse } from 'next/server';
import { getOidcClient } from '../../../../lib/auth/oidc';

/** GET /api/auth/login — redirige vers Keycloak (code flow). */
export async function GET() {
  const client = await getOidcClient();
  const state = crypto.randomUUID();
  const nonce = crypto.randomUUID();
  const url = client.authorizationUrl({ scope: 'openid profile email roles', state, nonce });
  const res = NextResponse.redirect(url);
  res.cookies.set('oidc_state', state, { httpOnly: true, sameSite: 'lax' });
  res.cookies.set('oidc_nonce', nonce, { httpOnly: true, sameSite: 'lax' });
  return res;
}
