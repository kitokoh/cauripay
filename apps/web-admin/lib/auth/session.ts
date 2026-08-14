/**
 * Session back-office chiffrée (JWE jose) — cookie `goursi_admin_session`.
 *
 * - Chiffrement AES-256-GCM (alg `dir`, clé dérivée par SHA-256 du secret)
 *   → les rôles ne sont pas modifiables côté client ;
 * - `Secure` uniquement en production (http://localhost en dev) ;
 * - HttpOnly + SameSite=Lax ;
 * - expiration 8 h, vérifiée au décryptage.
 *
 * Compatible edge (middleware) : n'utilise que `crypto.subtle` (WebCrypto),
 * aucune API Node spécifique.
 */
import { EncryptJWT, SignJWT, jwtDecrypt, jwtVerify } from 'jose';
import {
  OAUTH_STATE_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  getSessionSecret,
  isProduction,
} from '../config';

/** Contenu de session (issu du token Keycloak après échange de code). */
export interface AdminSession {
  /** subject Keycloak. */
  sub: string;
  email?: string;
  name?: string;
  /** Rôles extraits de realm_access.roles (UserRole). */
  roles: string[];
  iat?: number;
  exp?: number;
}

const JWT_ISSUER = 'goursi-web-admin';
const JWT_AUDIENCE = 'goursi-web-admin';
const OAUTH_STATE_TTL_SECONDS = 10 * 60; // 10 min

/** Clé de chiffrement : SHA-256(SESSION_SECRET) → 32 octets (A256GCM, alg dir). */
export async function getSessionEncryptionKey(): Promise<Uint8Array> {
  const secret = getSessionSecret();
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return new Uint8Array(digest);
}

/** Chiffre une session en JWE (A256GCM). */
export async function encryptSession(session: AdminSession): Promise<string> {
  const key = await getSessionEncryptionKey();
  return new EncryptJWT({ ...session })
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .encrypt(key);
}

/** Déchiffre et valide une session (null si invalide/expirée/trafiquée). */
export async function decryptSession(token: string): Promise<AdminSession | null> {
  try {
    const key = await getSessionEncryptionKey();
    const { payload } = await jwtDecrypt(token, key, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    if (typeof payload.sub !== 'string' || payload.sub.length === 0 || !Array.isArray(payload.roles)) {
      return null;
    }
    return {
      sub: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      name: typeof payload.name === 'string' ? payload.name : undefined,
      roles: payload.roles.filter((role): role is string => typeof role === 'string'),
      iat: typeof payload.iat === 'number' ? payload.iat : undefined,
      exp: typeof payload.exp === 'number' ? payload.exp : undefined,
    };
  } catch {
    return null;
  }
}

/** Lit la session depuis la valeur du cookie (ou null si absent/invalide). */
export async function getSession(cookieValue: string | undefined | null): Promise<AdminSession | null> {
  if (!cookieValue) return null;
  return decryptSession(cookieValue);
}

/** Options du cookie de session (Secure uniquement en production). */
export function sessionCookieOptions(
  maxAgeSeconds: number = SESSION_MAX_AGE_SECONDS,
): { path: string; httpOnly: boolean; sameSite: 'lax'; secure: boolean; maxAge: number } {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction(),
    maxAge: maxAgeSeconds,
  };
}

/** Options de suppression du cookie de session. */
export function clearSessionCookieOptions() {
  return sessionCookieOptions(0);
}

export { SESSION_COOKIE_NAME, OAUTH_STATE_COOKIE_NAME, SESSION_MAX_AGE_SECONDS };

// ── État OAuth (state + nonce) — cookie signé court (anti-CSRF / anti-replay) ──

/** Signe l'état OAuth (state + nonce) dans un JWT HS256 (10 min). */
export async function signOAuthState(state: string, nonce: string): Promise<string> {
  const key = await getSessionEncryptionKey();
  return new SignJWT({ state, nonce })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${OAUTH_STATE_TTL_SECONDS}s`)
    .sign(key);
}

/** Vérifie l'état OAuth (null si absent/invalide/expiré). */
export async function verifyOAuthState(token: string): Promise<{ state: string; nonce: string } | null> {
  try {
    const key = await getSessionEncryptionKey();
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });
    if (typeof payload.state !== 'string' || typeof payload.nonce !== 'string') return null;
    return { state: payload.state, nonce: payload.nonce };
  } catch {
    return null;
  }
}
