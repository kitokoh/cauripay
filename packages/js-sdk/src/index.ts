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
  amountMinor: number;
  currency: string;
  to: string;
  description?: string;
  idempotencyKey?: string;
}

export interface PaymentResult {
  id: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'expired';
  amountMinor: number;
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
   * Anti-replay : fenêtre ±5 min.
   */
  verifySignature(secret: string, signature: string, payload: string): boolean {
    const tMatch = signature.match(/t=(\d+)/);
    const v1 = signature.split('v1=')[1];
    if (!tMatch || !v1) return false;

    const t = Number(tMatch[1]);
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - t) > 300) return false; // anti-replay ±5 min

    const expected = createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex');
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(v1, 'utf8');
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
