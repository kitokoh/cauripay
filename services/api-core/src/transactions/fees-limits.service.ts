import { Injectable } from '@nestjs/common';
import {
  calculateFee,
  checkKycLimit,
  KycLimitCheck,
} from '@goursi/validation-rules';
import { KycLevel, TransactionType } from '@goursi/shared-types';

/**
 * Frais & limites (GOURSI-023c) — délègue à packages/validation-rules (testé une fois).
 */
@Injectable()
export class FeesService {
  calculate(type: TransactionType, amountMinor: string): { feeAmount: string; breakdown: unknown } {
    return calculateFee(type, amountMinor);
  }
}

@Injectable()
export class LimitsService {
  /**
   * Vérifie les limites KYC avant traitement ; après succès, les totaux
   * sont dérivés des transactions SUCCESS (jamais stockés hors conformité).
   */
  check(
    kycLevel: KycLevel,
    amountMinor: string,
    dailyTotal: string,
    monthlyTotal: string,
    balance: string,
  ): KycLimitCheck {
    return checkKycLimit(kycLevel, amountMinor, dailyTotal, monthlyTotal, balance);
  }
}
