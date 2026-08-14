import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Hachage sha256 hex (clés API — jamais stockées en clair, spec §8).
 */
export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * Comparaison en TEMPS CONSTANT (crypto.timingSafeEqual) — anti timing attack.
 * Les deux entrées doivent être des hex sha256 (64 caractères → buffers 32 o).
 */
export function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}
