import { randomBytes } from 'node:crypto';

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Identifiant aléatoire base62 (~80 bits pour 10 octets). */
export function randId(bytes = 10): string {
  const buf = randomBytes(bytes);
  let out = '';
  for (const b of buf) out += ALPHABET[b % ALPHABET.length];
  return out;
}

export const newId = (prefix: string): string => `${prefix}_${randId()}`;
