/**
 * Session entreprise — JWT signé HS256 (jose), cookie `goursi_business_session`.
 *
 * Le cookie est httpOnly + sameSite=lax (pas d'accès JS) ; le JWT est signé et
 * vérifié avec SESSION_SECRET. Le payload porte l'identité OIDC (sub, email,
 * roles Keycloak) et les flags 2FA :
 *  - `twoFactorEnrolled` : l'utilisateur a un secret TOTP enregistré
 *  - `twoFactorVerified` : 2FA validée pour CETTE session (obligatoire, sinon
 *    le middleware ne laisse passer aucune route)
 *  - `pending2faSecret` : secret TOTP provisoire (1er login, avant enroll)
 */
import { jwtVerify, SignJWT } from 'jose';

export const SESSION_COOKIE_NAME = 'goursi_business_session';
export const SESSION_ISSUER = 'goursi:web-business';
export const SESSION_AUDIENCE = 'goursi:web-business:session';

/** Identité OIDC (claims Keycloak) + état 2FA de la session. */
export interface SessionUser {
  sub: string;
  email?: string;
  name?: string;
  /** Rôles Keycloak (realm_access.roles). */
  roles?: string[];
  /** id_token OIDC conservé pour l'end_session côté Keycloak (logout). */
  idToken?: string;
  /** Secret TOTP enregistré pour cet utilisateur ? */
  twoFactorEnrolled: boolean;
  /** 2FA validée lors de cette session ? */
  twoFactorVerified: boolean;
  /** Secret TOTP provisoire en attente d'enrôlement (1er login). */
  pending2faSecret?: string;
}

interface SessionOptions {
  /** Secret de signature (défaut : SESSION_SECRET). */
  secret?: string;
  /** Durée de vie (format jose, ex. '8h'). */
  expiresIn?: string;
}

interface VerifyOptions {
  secret?: string;
  /** Date courante injectable (tests d'expiration). */
  currentDate?: Date;
}

/** Secret de signature ; refuse de démarrer en production sans SESSION_SECRET. */
function resolveSecret(secret?: string): Uint8Array {
  const value = secret ?? process.env.SESSION_SECRET;
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET est requis en production (voir .env.example)');
  }
  return new TextEncoder().encode(value ?? 'dev-insecure-session-secret-change-me');
}

/** Signe un JWT de session à partir du payload utilisateur. */
export async function createSession(
  user: SessionUser,
  options: SessionOptions = {},
): Promise<string> {
  const expiresIn = options.expiresIn ?? `${process.env.SESSION_MAX_AGE_H ?? '8'}h`;
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setIssuer(SESSION_ISSUER)
    .setAudience(SESSION_AUDIENCE)
    .setExpirationTime(expiresIn)
    .sign(resolveSecret(options.secret));
}

/** Vérifie et décode une session. Retourne null si absente/invalide/expirée. */
export async function readSession(
  token: string | null | undefined,
  options: VerifyOptions = {},
): Promise<SessionUser | null> {
  if (!token) {
    return null;
  }
  try {
    const { payload } = await jwtVerify(token, resolveSecret(options.secret), {
      issuer: SESSION_ISSUER,
      audience: SESSION_AUDIENCE,
      currentDate: options.currentDate,
    });
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}
