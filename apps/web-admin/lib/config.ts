/**
 * Configuration de web-admin — lecture des variables d'environnement.
 *
 * Edge-safe : ne lit que `process.env` (aucune API Node), donc utilisable
 * depuis `middleware.ts` ET depuis les route handlers / composants serveur.
 *
 * Règle GOURSI : AUCUN secret côté client — tout est lu côté serveur.
 */

export const SESSION_COOKIE_NAME = 'goursi_admin_session';
export const OAUTH_STATE_COOKIE_NAME = 'goursi_admin_oauth_state';
/** Durée de vie de la session back-office (secondes). */
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60; // 8 h

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Secret de chiffrement de la session (JWE).
 * SESSION_SECRET recommandé ; repli sur JWT_SECRET (existant dans .env.example).
 */
export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET ?? process.env.JWT_SECRET;
  if (secret) return secret;
  if (isProduction()) {
    throw new Error('SESSION_SECRET manquant (ou JWT_SECRET) — requis en production');
  }
  return 'web-admin-dev-session-secret-change-me';
}

/** Issuer Keycloak (ex. http://keycloak:8080/realms/goursi). */
export function getKeycloakIssuerUrl(): string {
  const issuer = process.env.JWT_ISSUER;
  if (issuer) return issuer.replace(/\/$/, '');
  if (isProduction()) {
    throw new Error('JWT_ISSUER manquant — requis en production');
  }
  return 'http://localhost:8080/realms/goursi';
}

/** Client OIDC déclaré dans Keycloak (confidential client). */
export function getKeycloakClientId(): string {
  return process.env.KEYCLOAK_CLIENT_ID ?? 'web-admin';
}

export function getKeycloakClientSecret(): string {
  const secret = process.env.KEYCLOAK_CLIENT_SECRET;
  if (secret) return secret;
  if (isProduction()) {
    throw new Error('KEYCLOAK_CLIENT_SECRET manquant — requis en production');
  }
  return 'dev-client-secret'; // valeur .env.example (dev uniquement)
}

/** Base URL d'api-core (orchestrateur). */
export function getApiCoreBaseUrl(): string {
  return process.env.API_CORE_BASE_URL ?? 'http://localhost:3000';
}

/** Clé inter-services (en-tête X-Service-Key) — même valeur que les services. */
export function getInternalServiceKey(): string {
  return process.env.INTERNAL_SERVICE_KEY ?? 'dev_internal_service_key_change_me';
}
