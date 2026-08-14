import { createHmac, timingSafeEqual } from 'crypto';

/**
 * @goursi/js-sdk — SDK officiel TypeScript (Node + navigateur).
 * payments.initiate / webhooks.verifySignature avec gestion d'erreurs typée.
 */

export interface GoursiClientOptions {
  apiKey: string;
  baseUrl?: string;
  sandbox?: boolean;
}

export interface InitiatePaymentInput {
  /** Montant en unités mineures, TOUJOURS en string (spec §8.2 — jamais de float). */
  amount: string;
  currency: string;
  to: string;
  description?: string;
  idempotencyKey?: string;
}

export interface PaymentResult {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'REVERSED';
  amount: string;
  currency: string;
  checkoutUrl?: string;
}

/** Erreur typée — code API conservé. */
export class GoursiApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'GoursiApiError';
  }
}

export class GoursiClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(options: GoursiClientOptions) {
    if (!options.apiKey?.startsWith('sk_')) {
      throw new Error('apiKey invalide : doit commencer par sk_');
    }
    this.apiKey = options.apiKey;
    this.baseUrl =
      options.baseUrl ??
      (options.sandbox ? 'https://sandbox.api.goursi.dev/v1' : 'https://api.goursi.dev/v1');
  }

  /** Initie un paiement (mode sandbox par défaut si sandbox: true). */
  async paymentsInitiate(input: InitiatePaymentInput): Promise<PaymentResult> {
    if (typeof input.amount !== 'string' || !/^\d+$/.test(input.amount)) {
      throw new Error('amount doit être un string d’unités mineures (spec §8.2 — jamais de float)');
    }
    const res = await fetch(`${this.baseUrl}/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...(input.idempotencyKey ? { 'Idempotency-Key': input.idempotencyKey } : {}),
      },
      body: JSON.stringify(input),
    });
    const json = (await res.json().catch(() => null)) as
      | { success: true; data: PaymentResult }
      | { success: false; error: { code: string; message: string } };

    if (!res.ok || !json || !json.success) {
      const err =
        json && 'error' in json
          ? json.error
          : { code: 'API_ERROR', message: `Erreur ${res.status}` };
      throw new GoursiApiError(res.status, err.code, err.message);
    }
    return json.data;
  }

  /**
   * Vérifie une signature webhook : header `t=<unix>,v1=<hmac>`.
   * Anti-replay : fenêtre ±5 min (tolérance configurable).
   */
  verifySignature(secret: string, signature: string, payload: string, toleranceSeconds = 300): boolean {
    const tMatch = signature.match(/t=(\d+)/);
    const v1Match = signature.match(/v1=([0-9a-f]+)/);
    if (!tMatch || !v1Match) return false;

    const t = Number(tMatch[1]);
    const now = Math.floor(Date.now() / 1000);
    if (Number.isNaN(t) || Math.abs(now - t) > toleranceSeconds) return false; // anti-replay

    const expected = createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex');
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(v1Match[1], 'utf8');
    return a.length === b.length && timingSafeEqual(a, b);
  }

  /** Récupère un paiement par son identifiant. */
  async paymentsGet(paymentId: string): Promise<PaymentResult> {
    const res = await fetch(`${this.baseUrl}/payments/${paymentId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    const json = (await res.json().catch(() => null)) as
      | { success: true; data: PaymentResult }
      | { success: false; error: { code: string; message: string } };
    if (!res.ok || !json || !json.success) {
      const err =
        json && 'error' in json
          ? json.error
          : { code: 'API_ERROR', message: `Erreur ${res.status}` };
      throw new GoursiApiError(res.status, err.code, err.message);
    }
    return json.data;
  }

  /** Annule un paiement (statut PENDING uniquement). */
  async paymentsCancel(paymentId: string): Promise<PaymentResult> {
    const res = await fetch(`${this.baseUrl}/payments/${paymentId}/cancel`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    const json = (await res.json().catch(() => null)) as
      | { success: true; data: PaymentResult }
      | { success: false; error: { code: string; message: string } };
    if (!res.ok || !json || !json.success) {
      const err =
        json && 'error' in json
          ? json.error
          : { code: 'API_ERROR', message: `Erreur ${res.status}` };
      throw new GoursiApiError(res.status, err.code, err.message);
    }
    return json.data;
  }
}
