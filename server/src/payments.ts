import { qall, qget, qrun } from './db.js';
import { newId } from './ids.js';
import { CURRENCIES, currencyByCode, methodById, ALL_METHOD_IDS } from './registries.js';
import { parseJson, toIso } from './util.js';
import { dispatchEvent } from './webhooks.js';

export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled' | 'expired';

export interface PaymentRow {
  id: string;
  merchant_id: string;
  amount_minor: number;
  currency: string;
  methods: string;
  status: PaymentStatus;
  provider: string | null;
  provider_ref: string | null;
  phone: string | null;
  description: string;
  metadata: string;
  redirect_url: string | null;
  idempotency_key: string | null;
  mode: 'test' | 'live';
  checkout_token: string;
  created_at: string;
  updated_at: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export function paymentToJson(row: PaymentRow): Record<string, unknown> {
  const timeline = (
    qall<{ type: string; created_at: string }>('SELECT type, created_at FROM events WHERE payment_id = ? ORDER BY created_at ASC, rowid ASC', row.id)
  ).map((e) => ({ type: e.type, created_at: e.created_at }));

  return {
    id: row.id,
    status: row.status,
    amount_minor: row.amount_minor,
    currency: row.currency,
    methods: parseJson<string[]>(row.methods, []),
    provider: row.provider,
    provider_ref: row.provider_ref,
    phone: row.phone,
    description: row.description,
    metadata: parseJson<Record<string, unknown>>(row.metadata, {}),
    redirect_url: row.redirect_url,
    mode: row.mode,
    checkout_url: `${publicCheckoutBase()}/checkout/${row.checkout_token}`,
    idempotency_key: row.idempotency_key,
    created_at: row.created_at,
    updated_at: row.updated_at,
    timeline,
  };
}

export function publicCheckoutBase(): string {
  return (globalThis as { __base?: string }).__base ?? 'http://localhost:4000';
}

const EVENT_LABELS: Record<string, string> = {
  'payment.created': 'Paiement créé',
  'payment.processing': 'En cours de traitement',
  'payment.succeeded': 'Paiement réussi',
  'payment.failed': 'Paiement échoué',
  'payment.cancelled': 'Paiement annulé',
  'payment.expired': 'Paiement expiré',
};

export const eventLabel = (type: string): string => EVENT_LABELS[type] ?? type;

// ---------- Machine à états ----------

const TRANSITIONS: Record<PaymentStatus, Partial<Record<PaymentStatus, string>>> = {
  pending: {
    processing: 'payment.processing',
    cancelled: 'payment.cancelled',
    succeeded: 'payment.succeeded',
    failed: 'payment.failed',
    expired: 'payment.expired',
  },
  processing: {
    succeeded: 'payment.succeeded',
    failed: 'payment.failed',
    expired: 'payment.expired',
  },
  succeeded: {},
  failed: {},
  cancelled: {},
  expired: {},
};

export function canTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  return to in TRANSITIONS[from];
}

// ---------- Requêtes ----------

export function getPayment(merchantId: string, paymentId: string): PaymentRow | undefined {
  return qget<PaymentRow>('SELECT * FROM payments WHERE id = ? AND merchant_id = ?', paymentId, merchantId);
}

export function getPaymentByCheckoutToken(token: string): PaymentRow | undefined {
  return qget<PaymentRow>('SELECT * FROM payments WHERE checkout_token = ?', token);
}

export function listPayments(merchantId: string, opts: { status?: string; limit: number; before?: string }): { rows: PaymentRow[]; hasMore: boolean } {
  const limit = Math.min(Math.max(opts.limit || 25, 1), 100);
  const clauses = ['merchant_id = ?'];
  const params: unknown[] = [merchantId];
  if (opts.status) {
    clauses.push('status = ?');
    params.push(opts.status);
  }
  if (opts.before) {
    const b = qget<{ created_at: string; id: string }>('SELECT created_at, id FROM payments WHERE id = ? AND merchant_id = ?', opts.before, merchantId);
    if (b) {
      clauses.push('(created_at < ? OR (created_at = ? AND id < ?))');
      params.push(b.created_at, b.created_at, b.id);
    }
  }
  const rows = qall<PaymentRow>(`SELECT * FROM payments WHERE ${clauses.join(' AND ')} ORDER BY created_at DESC, id DESC LIMIT ?`, ...params, limit + 1);
  return { rows: rows.slice(0, limit), hasMore: rows.length > limit };
}

// ---------- Événements ----------

function emitEvent(paymentId: string, type: string, data: Record<string, unknown>): void {
  const event = { id: newId('evt'), payment_id: paymentId, type, data: JSON.stringify(data), created_at: toIso() };
  qrun('INSERT INTO events (id, payment_id, type, data, created_at) VALUES (?, ?, ?, ?, ?)', 
    event.id, event.payment_id, event.type, event.data, event.created_at);
}

// ---------- Création ----------

export interface CreatePaymentInput {
  amount_minor: number;
  currency: string;
  methods?: string[];
  description?: string;
  metadata?: Record<string, unknown>;
  redirect_url?: string;
  idempotency_key?: string;
}

export function createPayment(merchantId: string, mode: 'test' | 'live', input: CreatePaymentInput): { payment: PaymentRow; duplicate: boolean } {
  if (!Number.isInteger(input.amount_minor) || input.amount_minor <= 0) {
    throw new ApiError(400, 'invalid_amount', 'amount_minor doit être un entier positif (unités mineures).');
  }
  if (!currencyByCode(input.currency)) {
    throw new ApiError(400, 'unknown_currency', `Devise inconnue. Disponibles : ${CURRENCIES.map((c) => c.code).join(', ')}`);
  }
  const methods = input.methods && input.methods.length > 0 ? input.methods : ALL_METHOD_IDS;
  for (const m of methods) {
    if (!methodById(m)) throw new ApiError(400, 'unknown_method', `Méthode inconnue : ${m}. Disponibles : ${ALL_METHOD_IDS.join(', ')}`);
  }
  if (input.description && input.description.length > 500) throw new ApiError(400, 'invalid_request_error', 'description trop longue (max 500).');
  if (input.redirect_url && !/^https?:\/\//.test(input.redirect_url)) throw new ApiError(400, 'invalid_request_error', 'redirect_url doit être une URL http(s).');
  if (input.metadata && (typeof input.metadata !== 'object' || Array.isArray(input.metadata))) throw new ApiError(400, 'invalid_request_error', 'metadata doit être un objet.');

  const idemKey = input.idempotency_key || null;
  if (idemKey) {
    const existing = qget<PaymentRow>('SELECT * FROM payments WHERE merchant_id = ? AND idempotency_key = ?', merchantId, idemKey);
    if (existing) return { payment: existing, duplicate: true };
  }

  const now = toIso();
  const payment: PaymentRow = {
    id: newId('pay'),
    merchant_id: merchantId,
    amount_minor: input.amount_minor,
    currency: input.currency.toUpperCase(),
    methods: JSON.stringify(methods),
    status: 'pending',
    provider: null,
    provider_ref: null,
    phone: null,
    description: input.description?.trim() || '',
    metadata: JSON.stringify(input.metadata || {}),
    redirect_url: input.redirect_url || null,
    idempotency_key: idemKey,
    mode,
    checkout_token: newId('ck'),
    created_at: now,
    updated_at: now,
  };
  qrun(
    `INSERT INTO payments (id, merchant_id, amount_minor, currency, methods, status, provider, provider_ref, phone, description, metadata, redirect_url, idempotency_key, mode, checkout_token, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    payment.id, payment.merchant_id, payment.amount_minor, payment.currency, payment.methods, payment.status,
    payment.provider, payment.provider_ref, payment.phone, payment.description, payment.metadata,
    payment.redirect_url, payment.idempotency_key, payment.mode, payment.checkout_token, payment.created_at, payment.updated_at);

  emitEvent(payment.id, 'payment.created', { payment: paymentToJson(payment) });
  void dispatchEvent(merchantId, mode, 'payment.created', { payment: paymentToJson(payment) });

  return { payment, duplicate: false };
}

// ---------- Transition (machine à états) ----------

export interface TransitionExtra {
  provider?: string;
  providerRef?: string;
  phone?: string;
  reason?: string;
}

export function transition(merchantId: string, paymentId: string, to: PaymentStatus, extra: TransitionExtra = {}): PaymentRow {
  const row = getPayment(merchantId, paymentId);
  if (!row) throw new ApiError(404, 'not_found', 'Paiement introuvable.');
  if (!canTransition(row.status, to)) {
    throw new ApiError(409, 'invalid_state', `Transition ${row.status} → ${to} interdite.`);
  }
  const eventType = TRANSITIONS[row.status][to]!;
  const now = toIso();

  qrun(
    `UPDATE payments SET status = ?, provider = COALESCE(?, provider), provider_ref = COALESCE(?, provider_ref), phone = COALESCE(?, phone), updated_at = ? WHERE id = ?`,
  to, extra.provider ?? null, extra.providerRef ?? null, extra.phone ?? null, now, row.id);

  const fresh = getPayment(merchantId, paymentId)!;
  emitEvent(fresh.id, eventType, { payment: paymentToJson(fresh), reason: extra.reason });
  void dispatchEvent(merchantId, fresh.mode, eventType, { payment: paymentToJson(fresh), reason: extra.reason });
  return fresh;
}
