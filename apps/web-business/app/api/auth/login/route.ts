import { NextResponse } from 'next/server';
import { Issuer } from 'openid-client';

/** GET /api/auth/login — redirige vers Keycloak (code flow). */
export async function GET() {
  const issuer = await Issuer.discover(
    process.env.KEYCLOAK_URL
      ? `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM ?? 'goursi'}`
      : 'http://localhost:8080/realms/goursi',
  );
  const client = new issuer.Client({
    client_id: process.env.KEYCLOAK_CLIENT_ID ?? 'web-business',
    client_secret: process.env.KEYCLOAK_CLIENT_SECRET ?? '',
    redirect_uris: [
      process.env.WEB_BUSINESS_REDIRECT_URI ?? 'http://localhost:3002/api/auth/callback',
    ],
    response_types: ['code'],
  });
  const state = crypto.randomUUID();
  const res = NextResponse.redirect(
    client.authorizationUrl({ scope: 'openid profile email', state }),
  );
  res.cookies.set('oidc_state', state, { httpOnly: true, sameSite: 'lax' });
  return res;
}
