import { createHash, randomBytes } from 'node:crypto';

/** SHA-256 hex (utilisé pour le stockage haché des clés sk_). */
export const sha256hex = (s: string): string => createHash('sha256').update(s).digest('hex');

/** Les clés sk_ ne sont JAMAIS stockées en clair : hash sha256 (lookup à temps quasi constant). */
export const apiKeyHash = (key: string): string => sha256hex(key);

export function generateApiKey(prefix: 'pk' | 'sk', mode: 'test' | 'live'): string {
  return `${prefix}_${mode}_${randomBytes(18).toString('base64url').replace(/-/g, 'A').replace(/_/g, 'B')}`;
}

export function generateWebhookSecret(mode: 'test' | 'live'): string {
  return `whsec_${mode}_${randomBytes(18).toString('base64url').replace(/-/g, 'A').replace(/_/g, 'B')}`;
}
