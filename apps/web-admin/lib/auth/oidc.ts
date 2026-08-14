/**
 * Client OIDC Keycloak (openid-client) — authorization code flow.
 *
 * - Découverte de l'issuer via `JWT_ISSUER/.well-known/openid-configuration` ;
 * - client confidentiel `web-admin` (secret : KEYCLOAK_CLIENT_SECRET) ;
 * - extraction des rôles depuis `realm_access.roles` du token ID ;
 * - déconnexion via `end_session_endpoint`.
 *
 * Node uniquement (utilisé par les route handlers /api/auth/*) — PAS importé
 * depuis le middleware (edge).
 */
import { Issuer, generators, type Client, type TokenSet } from 'openid-client';
import {
  getKeycloakClientId,
  getKeycloakClientSecret,
  getKeycloakIssuerUrl,
} from '../config';

let clientPromise: Promise<Client> | null = null;

async function discoverClient(): Promise<Client> {
  const issuerUrl = getKeycloakIssuerUrl();
  const wellKnownUrl = `${issuerUrl}/.well-known/openid-configuration`;
  const issuer = await Issuer.discover(wellKnownUrl);
  return new issuer.Client({
    client_id: getKeycloakClientId(),
    client_secret: getKeycloakClientSecret(),
    redirect_uris: [], // vérifiée à l'échange (paramètre redirect_uri)
    response_types: ['code'],
  });
}

/** Client OIDC mémorisé (découverte unique). */
export function getOidcClient(): Promise<Client> {
  if (!clientPromise) {
    clientPromise = discoverClient().catch((error) => {
      clientPromise = null; // permet un retry au prochain appel
      throw error;
    });
  }
  return clientPromise;
}

/** Génère state + nonce pour la requête d'autorisation. */
export function generateStateAndNonce(): { state: string; nonce: string } {
  return { state: generators.state(), nonce: generators.nonce() };
}

/** Construit l'URL d'autorisation Keycloak. */
export async function buildAuthorizationUrl(params: {
  state: string;
  nonce: string;
  redirectUri: string;
}): Promise<string> {
  const client = await getOidcClient();
  return client.authorizationUrl({
    scope: 'openid profile email roles',
    state: params.state,
    nonce: params.nonce,
    redirect_uri: params.redirectUri,
  });
}

/** Profil extrait du token ID après échange du code. */
export interface OidcProfile {
  sub: string;
  email?: string;
  name?: string;
  roles: string[];
  idToken?: string;
}

/**
 * Échange le code d'autorisation contre des tokens, vérifie state/nonce
 * (openid-client) et extrait le profil + les rôles (realm_access.roles).
 */
export async function exchangeCodeForSession(params: {
  code: string;
  redirectUri: string;
  expectedState: string;
  expectedNonce: string;
}): Promise<OidcProfile> {
  const client = await getOidcClient();
  const tokenSet: TokenSet = await client.callback(
    params.redirectUri,
    { code: params.code },
    { state: params.expectedState, nonce: params.expectedNonce },
  );
  const claims = tokenSet.claims();
  const realmAccess = (claims as { realm_access?: { roles?: unknown } }).realm_access;
  const roles = Array.isArray(realmAccess?.roles)
    ? realmAccess.roles.filter((role): role is string => typeof role === 'string')
    : [];

  return {
    sub: claims.sub ?? '',
    email: typeof claims.email === 'string' ? claims.email : undefined,
    name: typeof claims.name === 'string' ? claims.name : undefined,
    roles,
    idToken: tokenSet.id_token,
  };
}

/** URL de fin de session Keycloak (ou null si non supportée). */
export async function getEndSessionUrl(postLogoutRedirectUri?: string): Promise<string | null> {
  const client = await getOidcClient();
  try {
    const params = postLogoutRedirectUri ? { post_logout_redirect_uri: postLogoutRedirectUri } : {};
    return client.endSessionUrl(params);
  } catch {
    return null; // end_session_endpoint absent des métadonnées
  }
}
