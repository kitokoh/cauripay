import { HttpClient } from './http';
import { Webhooks } from './webhooks';
import type { GoursiClientOptions, InitiatePaymentParams, PaymentResult } from './types';

/**
 * Client officiel GOURSI (CauriPay).
 *
 * ```ts
 * import { GoursiClient } from '@goursi/js-sdk';
 * const goursi = new GoursiClient({ apiKey: 'sk_test_…', webhookSecret: 'whsec_…' });
 *
 * const payment = await goursi.payments.initiate({ amount: '25000', to: '+23566000001' });
 * const ok = goursi.webhooks.verifySignature(sig, rawBody);
 * ```
 */
export class GoursiClient {
  readonly payments: Payments;
  readonly webhooks: Webhooks;

  constructor(options: GoursiClientOptions & { webhookSecret?: string }) {
    const http = new HttpClient(options);
    this.payments = new Payments(http);
    this.webhooks = new Webhooks(options.webhookSecret ?? '');
  }
}

export class Payments {
  constructor(private readonly http: HttpClient) {}

  /** Crée un paiement (idempotent via header Idempotency-Key). */
  async initiate(params: InitiatePaymentParams, idempotencyKey?: string): Promise<PaymentResult> {
    return this.http.request<PaymentResult>('POST', '/api/v1/payments', params, {
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    });
  }

  /** Récupère un paiement. */
  async get(paymentId: string): Promise<PaymentResult> {
    return this.http.request<PaymentResult>('GET', `/api/v1/payments/${paymentId}`);
  }

  /** Annule un paiement (statut PENDING uniquement). */
  async cancel(paymentId: string): Promise<PaymentResult> {
    return this.http.request<PaymentResult>('POST', `/api/v1/payments/${paymentId}/cancel`);
  }
}
