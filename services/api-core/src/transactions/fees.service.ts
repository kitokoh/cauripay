import { Injectable } from '@nestjs/common';
import { calculateFee, checkKycLimit } from '@cauripay/validation-rules';
import type { KycLevel } from '@cauripay/validation-rules';
import { TransactionType } from '@prisma/client';

/**
 * Frais & limites KYC (spec §2.3).
 * Montants en Decimal (jamais de float). centralisé dans packages/validation-rules.
 */
@Injectable()
export class FeesService {
  /** Frais pour un type + montant (unités mineures). */
  feeFor(type: TransactionType, amountMinor: number): { feeAmount: number } {
    const { feeAmount } = calculateFee(this.toFeeType(type), amountMinor);
    return { feeAmount: feeAmount.toNumber() };
  }

  /** Limites KYC : montant + totaux journaliers/mensuels + solde. */
  checkKyc(
    kycLevel: string,
    amountMinor: number,
    dailyTotal: number,
    monthlyTotal: number,
    balance: number,
  ) {
    const level = kycLevel as KycLevel;
    return checkKycLimit(level, amountMinor, dailyTotal, monthlyTotal, balance);
  }

  private toFeeType(
    type: TransactionType,
  ): 'P2P' | 'CASH_IN' | 'CASH_OUT' | 'BILL_PAYMENT' | 'MERCHANT_PAYMENT' {
    return type as unknown as 'P2P' | 'CASH_IN' | 'CASH_OUT' | 'BILL_PAYMENT' | 'MERCHANT_PAYMENT';
  }
}
