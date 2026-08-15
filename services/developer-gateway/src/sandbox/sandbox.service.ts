import { Injectable } from '@nestjs/common';

export interface SandboxPayment {
  id: string;
  developerId: string;
  amountMinor: number;
  currency: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'expired';
  createdAt: Date;
}

/**
 * Sandbox isolé (GOURSI-050c) : simulateur de flux fidèle (approve/fail/expire),
 * AUCUN appel de prod possible depuis le mode sandbox.
 */
@Injectable()
export class SandboxService {
  private readonly payments = new Map<string, SandboxPayment>();

  initiate(developerId: string, dto: { amountMinor: number; currency: string }): SandboxPayment {
    const payment: SandboxPayment = {
      id: `pay_${crypto.randomUUID().slice(0, 12)}`,
      developerId,
      amountMinor: dto.amountMinor,
      currency: dto.currency,
      status: 'pending',
      createdAt: new Date(),
    };
    this.payments.set(payment.id, payment);
    return payment;
  }

  /** Approbation : pending → processing → succeeded (flux fidèle ~1,5 s). */
  approve(id: string): SandboxPayment | null {
    const payment = this.payments.get(id);
    if (!payment) return null;
    if (payment.status === 'pending') {
      payment.status = 'processing';
      return payment;
    }
    if (payment.status === 'processing') {
      payment.status = 'succeeded';
      return payment;
    }
    return null;
  }

  fail(id: string): SandboxPayment | null {
    const payment = this.payments.get(id);
    if (!payment || payment.status !== 'processing') return null;
    payment.status = 'failed';
    return payment;
  }

  expire(id: string): SandboxPayment | null {
    const payment = this.payments.get(id);
    if (!payment || payment.status !== 'processing') return null;
    payment.status = 'expired';
    return payment;
  }

  get(id: string): SandboxPayment | undefined {
    return this.payments.get(id);
  }
}
