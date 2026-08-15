import { Issuer } from 'openid-client';

export interface AdminSession {
  sub: string;
  email: string;
  roles: string[];
  accessToken: string;
}

/**
 * Client OIDC Keycloak (code flow) — jamais de secrets côté client.
 * Les tokens vivent côté serveur (session httpOnly).
 */
export async function getOidcClient() {
  const issuer = await Issuer.discover(
    process.env.KEYCLOAK_URL
      ? `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM ?? 'goursi'}`
      : 'http://localhost:8080/realms/goursi',
  );
  return new issuer.Client({
    client_id: process.env.KEYCLOAK_CLIENT_ID ?? 'web-admin',
    client_secret: process.env.KEYCLOAK_CLIENT_SECRET ?? '',
    redirect_uris: [
      process.env.WEB_ADMIN_REDIRECT_URI ?? 'http://localhost:3001/api/auth/callback',
    ],
    response_types: ['code'],
  });
}
