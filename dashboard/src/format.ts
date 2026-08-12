import type { PaymentStatus } from './api';

export const CURRENCIES = ['XOF', 'XAF', 'GNF', 'CDF', 'NGN', 'GHS', 'EUR', 'USD'];

export const METHODS: Record<string, { label: string; emoji: string }> = {
  orange_money: { label: 'Orange Money', emoji: '🟠' },
  mtn_momo: { label: 'MTN MoMo', emoji: '🟡' },
  moov_money: { label: 'Moov Money', emoji: '🔵' },
  wave: { label: 'Wave', emoji: '🌊' },
  card: { label: 'Carte (Visa/MC)', emoji: '💳' },
  international: { label: 'International', emoji: '🌍' },
};

export const methodLabel = (id: string | null): string =>
  id ? (METHODS[id]?.label ?? id) : '—';

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

export function formatMoney(minor: number, currency: string): string {
  const zero = ['XOF', 'XAF', 'GNF', 'CDF'];
  if (zero.includes(currency)) return `${minor.toLocaleString('fr-FR')} ${currency}`;
  return `${(minor / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
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
