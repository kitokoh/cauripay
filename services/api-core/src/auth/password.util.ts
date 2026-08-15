import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * Hachage des mots de passe / MPIN / codes OTP — scrypt natif (node:crypto).
 * Choix d'architecture : pas de dépendance native (bcrypt → tar/node-pre-gyp
 * = chaîne de vulnérabilités critiques), aligné sur le legacy v0.1 et sur
 * DESIGN.md (scrypt documenté comme choix validé).
 *
 * Format : `<saltHex>:<hashHex>` (32 octets de sel, 64 octets de hash).
 */
const SCRYPT_KEYLEN = 64;

export function hashSecret(value: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(value, salt, SCRYPT_KEYLEN).toString('hex');
  return `${salt}:${hash}`;
}

export function verifySecret(value: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = scryptSync(value, salt, SCRYPT_KEYLEN);
  return timingSafeEqual(candidate, Buffer.from(hash, 'hex'));
}
