import type { PaymentStatus } from './api';
import { currencyByCode, methodById } from './registries';

export const methodLabel = (id: string | null): string => (id ? (methodById(id)?.label ?? id) : '—');

export const STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'En attente',
  processing: 'En traitement',
  succeeded: 'Réussi',
  failed: 'Échoué',
  cancelled: 'Annulé',
  expired: 'Expiré',
};

export const EVENT_LABELS: Record<string, string> = {
  'payment.created': 'Paiement créé',
  'payment.processing': 'En cours de traitement',
  'payment.succeeded': 'Paiement réussi',
  'payment.failed': 'Paiement échoué',
  'payment.cancelled': 'Paiement annulé',
  'payment.expired': 'Paiement expiré',
  'webhook.test': 'Ping de test',
};

/** Formate un montant en unités mineures — décimales issues du registre API (plus de liste dupliquée). */
export function formatMoney(minor: number, currency: string): string {
  const def = currencyByCode(currency);
  const decimals = def ? def.decimals : 0;
  if (decimals === 0) return `${minor.toLocaleString('fr-FR')} ${currency}`;
  return `${(minor / 10 ** decimals).toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} ${currency}`;
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export function shortId(id: string): string {
  return id.length > 14 ? `${id.slice(0, 10)}…${id.slice(-4)}` : id;
}

export function maskSecret(key: string): string {
  if (!key) return '';
  return key.length > 16 ? `${key.slice(0, 12)}••••••••${key.slice(-4)}` : key;
}

export function copyText(text: string): void {
  navigator.clipboard?.writeText(text).catch(() => {});
}
