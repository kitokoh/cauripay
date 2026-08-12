import { currencyByCode } from './registries.js';

/** Formate un montant en unités mineures selon la devise (ISO 4217). */
export function formatMoney(minor: number, currency: string): string {
  const def = currencyByCode(currency);
  const decimals = def ? def.decimals : 0;
  if (decimals === 0) return `${minor.toLocaleString('fr-FR')} ${currency}`;
  return `${(minor / 10 ** decimals).toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} ${currency}`;
}

/** Masque une clé pour l'affichage : sk_test_abcd…wxyz. */
export function maskKey(key: string, visible = 4): string {
  if (key.length <= visible + 3) return '••••';
  return `${key.slice(0, 12)}••••••••••••${key.slice(-visible)}`;
}

export function toIso(d = new Date()): string {
  return d.toISOString();
}

export function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Validation téléphone mobile (forme simple, suffisante en sandbox). */
export function isValidPhone(phone: string): boolean {
  return /^\+?[0-9]{8,15}$/.test(phone.trim());
}
