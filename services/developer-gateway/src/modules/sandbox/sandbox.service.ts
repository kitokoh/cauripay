import { Injectable } from '@nestjs/common';
import { nanoid } from 'nanoid';
import { WebhooksService } from '../webhooks/webhooks.service';
import { SandboxPaymentDto } from './dto/sandbox-payment.dto';

/** Événement simulé émis par chaque issue du simulateur de paiement. */
export const PAYMENT_EVENT_BY_OUTCOME: Record<string, string> = {
  approve: 'payment.succeeded',
  fail: 'payment.failed',
  expire: 'payment.expired',
};

export type PaymentOutcome = keyof typeof PAYMENT_EVENT_BY_OUTCOME;

/**
 * Sandbox fidèle et ISOLÉ (GOURSI-050a/c) : simulateur de flux de paiement
 * (approve / fail / expire) + événements génériques. AUCUN appel de prod —
 * tout se passe dans la base developer-gateway et les webhooks de test.
 */
@Injectable()
export class SandboxService {
  constructor(private readonly webhooks: WebhooksService) {}

  /** Issue de paiement simulée (approve → payment.succeeded, etc.). */
  async paymentOutcome(apiKeyId: string, outcome: PaymentOutcome, dto: SandboxPaymentDto) {
    const type = PAYMENT_EVENT_BY_OUTCOME[outcome];
    const data: Record<string, unknown> = {
      id: `sandbox_${nanoid(16)}`,
      status: outcome === 'approve' ? 'APPROVED' : outcome.toUpperCase(),
      amount: dto.amount,
      currency: dto.currency ?? 'XAF',
      reference: dto.reference,
      metadata: dto.metadata,
      sandbox: true,
      createdAt: new Date().toISOString(),
    };
    return this.webhooks.dispatchEvent(apiKeyId, { type, data });
  }

  /** Événement générique (simule le simulateur tiers). */
  async dispatch(apiKeyId: string, type: string, data: Record<string, unknown>) {
    const payload: Record<string, unknown> = {
      ...data,
      id: `sandbox_${nanoid(16)}`,
      sandbox: true,
      createdAt: new Date().toISOString(),
    };
    return this.webhooks.dispatchEvent(apiKeyId, { type, data: payload });
  }
}
