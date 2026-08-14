/**
 * @goursi/js-sdk — types publics du SDK.
 * Règle : montants en string (Decimal) — jamais number flottant (spec §8.2).
 */

/** Options de construction du client. */
export interface GoursiClientOptions {
  /** Clé API sandbox (sk_test_…) ou live (sk_live_…). */
  apiKey: string;
  /** URL de base de l'API. Défaut : https://api.cauripay.com */
  baseUrl?: string;
  /** Timeout des requêtes en ms (défaut : 15000). */
  timeoutMs?: number;
  /** Headers additionnels (ex: Idempotency-Key, traceparent). */
  headers?: Record<string, string>;
}

/** Statut d'un paiement (spec §4.4). */
export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED'
  | 'REVERSED';

/** Résultat de payment.initiate(). */
export interface PaymentResult {
  id: string;
  status: PaymentStatus;
  amount: string;
  currency: string;
  checkoutUrl?: string;
  provider?: string;
  metadata?: Record<string, unknown>;
}

/** Requête de paiement. */
export interface InitiatePaymentParams {
  amount: string; // unités mineures, ex: "25000" pour 250 XOF
  to: string; // accountNumber ou phone du destinataire
  currency?: string; // défaut : XAF
  description?: string;
  metadata?: Record<string, unknown>;
  /** Méthodes acceptées (ex: ["orange_money","mtn_momo","card"]). */
  methods?: string[];
}

/** Erreur typée renvoyée par l'API. */
export interface ApiErrorBody {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/** Enveloppe de réponse API (spec shared-types). */
export interface ApiEnvelope<T> {
  success: true;
  data: T;
  timestamp: string;
  requestId: string;
}

/** Enveloppe d'erreur. */
export interface ApiErrorEnvelope {
  success: false;
  error: ApiErrorBody;
  timestamp: string;
  requestId: string;
}
