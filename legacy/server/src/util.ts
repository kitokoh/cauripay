import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';
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

// ---------- Anti-SSRF (webhooks sortants) ----------

/** IPv4 privées/réservées : RFC 1918, loopback, link-local, CGNAT, 0.0.0.0. */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return false;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

/** IPv6 privées/réservées : loopback, ULA fc00::/7, link-local fe80::/10, v4-mappées privées. */
function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::' || lower === '::1') return true;
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // ULA
  if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true; // link-local
  const m = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (m) return isPrivateIPv4(m[1]);
  return false;
}

/** true si l'adresse (IP littérale) est privée/locale. Les hostnames → false (résolus ailleurs). */
export function isPrivateAddress(host: string): boolean {
  const v = isIP(host);
  if (v === 4) return isPrivateIPv4(host);
  if (v === 6) return isPrivateIPv6(host);
  return false;
}

export interface WebhookUrlCheck {
  ok: boolean;
  reason?: string;
}

/**
 * Valide une URL de webhook sortant (anti-SSRF) :
 * - protocole http/https uniquement ;
 * - en production : https exigé (sauf override) et aucune IP privée/locale
 *   (y compris après résolution DNS — toutes les adresses sont contrôlées).
 */
export async function isSafeWebhookUrl(rawUrl: string, opts: { blockPrivate: boolean; requireHttps: boolean }): Promise<WebhookUrlCheck> {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return { ok: false, reason: 'URL invalide.' };
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return { ok: false, reason: 'Protocole non supporté (http/https uniquement).' };
  }
  if (opts.requireHttps && u.protocol !== 'https:') {
    return { ok: false, reason: 'Le mode production exige une URL https.' };
  }
  if (!opts.blockPrivate) return { ok: true };

  if (isIP(u.hostname)) {
    return isPrivateAddress(u.hostname) ? { ok: false, reason: 'Adresse IP privée/locale interdite (anti-SSRF).' } : { ok: true };
  }
  try {
    const addrs = await lookup(u.hostname, { all: true });
    if (addrs.length === 0) return { ok: false, reason: 'Hôte introuvable.' };
    const bad = addrs.find((a) => isPrivateAddress(a.address));
    if (bad) return { ok: false, reason: `Hôte résolu vers une adresse privée/locale (${u.hostname} → ${bad.address}), interdite (anti-SSRF).` };
    return { ok: true };
  } catch {
    return { ok: false, reason: 'Résolution DNS impossible.' };
  }
}
