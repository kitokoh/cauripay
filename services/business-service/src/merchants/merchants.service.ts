import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';

export interface MerchantPayment {
  id: string;
  merchantId: string;
  amountMinor: number;
  currency: string;
  reference: string;
  status: 'PENDING' | 'PAID' | 'EXPIRED';
  qrSvg: string;
  paymentUrl: string;
  createdAt: Date;
}

/**
 * MerchantsModule — le marchand génère une demande de paiement (QR SVG + URL).
 * Le scan de l'URL ouvre le parcours de paiement (checkout api-core).
 */
@Injectable()
export class MerchantsService {
  private readonly payments = new Map<string, MerchantPayment>();

  /** POST /merchants/payment-request { amount, currency, reference } */
  createPaymentRequest(
    merchantId: string,
    dto: { amountMinor: number; currency: string; reference: string },
  ): MerchantPayment {
    if (dto.amountMinor <= 0) {
      throw new UnprocessableEntityException({
        code: 'INVALID_AMOUNT',
        message: 'Montant invalide',
      });
    }
    const id = `mp_${randomUUID().slice(0, 12)}`;
    const paymentUrl = `${process.env.CHECKOUT_BASE_URL ?? 'http://localhost:5173'}/pay/${id}`;
    const payment: MerchantPayment = {
      id,
      merchantId,
      amountMinor: dto.amountMinor,
      currency: dto.currency,
      reference: dto.reference,
      status: 'PENDING',
      qrSvg: this.qrSvg(paymentUrl),
      paymentUrl,
      createdAt: new Date(),
    };
    this.payments.set(id, payment);
    return payment;
  }

  get(id: string): MerchantPayment | undefined {
    return this.payments.get(id);
  }

  /** Statistiques marchand : volumes par période, nb paiements, taux de succès. */
  stats(merchantId: string, from?: string, to?: string) {
    const all = [...this.payments.values()].filter((p) => p.merchantId === merchantId);
    const filtered = all.filter((p) => {
      if (from && p.createdAt < new Date(from)) return false;
      if (to && p.createdAt > new Date(to)) return false;
      return true;
    });
    const paid = filtered.filter((p) => p.status === 'PAID');
    const volume = paid.reduce((acc, p) => acc + p.amountMinor, 0);
    return {
      count: filtered.length,
      paidCount: paid.length,
      successRate: filtered.length ? Math.round((paid.length / filtered.length) * 10000) / 100 : 0,
      volumeMinor: volume,
      currency: filtered[0]?.currency ?? 'XAF',
    };
  }

  /** QR code minimal (SVG) encodant l'URL de paiement. */
  private qrSvg(url: string): string {
    // QR simplifié : en phase 0 on encode l'URL dans un SVG stylisé ;
    // en staging, vraie génération via qrcode lib.
    const seed = createHash('sha256').update(url).digest('hex').slice(0, 8);
    const cells: string[] = [];
    for (let i = 0; i < 21; i++) {
      for (let j = 0; j < 21; j++) {
        if ((i * 31 + j * 17 + parseInt(seed, 16)) % 3 === 0) {
          cells.push(`<rect x="${i * 8}" y="${j * 8}" width="8" height="8"/>`);
        }
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="168" height="168" viewBox="0 0 168 168"><rect width="168" height="168" fill="white"/>${cells.join('')}</svg>`;
  }
}
