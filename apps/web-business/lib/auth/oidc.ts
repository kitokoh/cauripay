/**
 * Client OIDC — Keycloak (realm `goursi`), client public `web-business`.
 *
 * Flux « authorization code + PKCE » standard (code flow) :
 *   GET /api/auth/login    → redirection Keycloak (state + code_challenge)
 *   GET /api/auth/callback → échange du code, userinfo, création de session
 *   GET /api/auth/logout   → end_session Keycloak (id_token_hint)
 *
 * Découverte OpenID (/.well-known/openid-configuration) effectuée une fois et
 * mise en cache. Ne PAS importer ce module depuis le middleware (runtime Node
 * uniquement — openid-client n'est pas compatible Edge).
 */
import { generators, Issuer, type Client, type TokenSet } from 'openid-client';

export const OIDC_STATE_COOKIE = 'goursi_business_oidc_state';
export const OIDC_VERIFIER_COOKIE = 'goursi_business_oidc_verifier';

function issuerUrl(): string {
  const url = process.env.OIDC_ISSUER_URL;
  if (!url) {
    throw new Error('OIDC_ISSUER_URL est requis (voir .env.example)');
  }
  return url;
}

function clientId(): string {
  return process.env.OIDC_CLIENT_ID ?? 'web-business';
}

let cachedClient: Promise<Client> | null = null;

/**
 * Retourne le client OIDC (découverte OpenID + enregistrement du client public).
 * Résultat mis en cache entre les requêtes (une seule découverte par process).
 */
export function getOidcClient(): Promise<Client> {
  if (!cachedClient) {
    cachedClient = Issuer.discover(issuerUrl()).then(
      (issuer) =>
        new issuer.Client({
          client_id: clientId(),
          response_types: ['code'],
          token_endpoint_auth_method: 'none', // client public (pas de secret)
          redirect_uris: [redirectUri()],
          post_logout_redirect_uris: [postLogoutRedirectUri()],
        }),
    );
  }
  return cachedClient;
}

/** URL de callback absolue (doit figurer dans les redirectUris Keycloak). */
export function redirectUri(): string {
  return process.env.OIDC_REDIRECT_URI ?? 'http://localhost:3002/api/auth/callback';
}

/** URL de retour après logout Keycloak. */
export function postLogoutRedirectUri(): string {
  return process.env.OIDC_POST_LOGOUT_REDIRECT_URI ?? 'http://localhost:3002/login';
}

/** URL d'autorisation (état + PKCE S256). */
export async function buildAuthorizationUrl(client: Client): Promise<{
  url: string;
  state: string;
  codeVerifier: string;
}> {
  const state = generators.state();
  const codeVerifier = generators.codeVerifier();
  const codeChallenge = generators.codeChallenge(codeVerifier);
  const url = client.authorizationUrl({
    scope: 'openid profile email',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  return { url, state, codeVerifier };
}

/** Échange le code d'autorisation contre un TokenSet (callback OIDC). */
export async function exchangeCode(
  client: Client,
  params: { code: string; state: string },
  codeVerifier: string,
): Promise<TokenSet> {
  return client.callback(redirectUri(), params, { code_verifier: codeVerifier });
}

export { generators };
