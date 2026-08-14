/**
 * @cauripay/validation-rules — Règles financières universelles.
 *
 * Les montants sont manipulés via `decimal.js` — jamais en number flottant.
 */

import Decimal from 'decimal.js';

export { Decimal };

export type AmountInput = string | number | Decimal;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type KycLevel = 'BASIC' | 'VERIFIED' | 'PREMIUM';

export type FeeType = 'P2P' | 'CASH_IN' | 'CASH_OUT' | 'BILL_PAYMENT' | 'MERCHANT_PAYMENT';

export interface KycLimitResult {
  allowed: boolean;
  reason:
    | 'OK'
    | 'ABOVE_SINGLE_LIMIT'
    | 'ABOVE_DAILY_LIMIT'
    | 'ABOVE_MONTHLY_LIMIT'
    | 'INSUFFICIENT_BALANCE';
  limits?: {
    maxPerTransaction: Decimal;
    dailyLimit: Decimal;
    monthlyLimit: Decimal;
  };
}

export interface FeeResult {
  feeAmount: Decimal;
}

export interface KycLimits {
  maxPerTransaction: Decimal;
  dailyLimit: Decimal;
  monthlyLimit: Decimal;
}

// ---------------------------------------------------------------------------
// Limites KYC (COBAC — spec §2.3)
// ---------------------------------------------------------------------------

const KYC_LIMITS: Record<KycLevel, KycLimits> = {
  BASIC: {
    maxPerTransaction: new Decimal(50_000),
    dailyLimit: new Decimal(200_000),
    monthlyLimit: new Decimal(500_000),
  },
  VERIFIED: {
    maxPerTransaction: new Decimal(500_000),
    dailyLimit: new Decimal(2_000_000),
    monthlyLimit: new Decimal(10_000_000),
  },
  PREMIUM: {
    maxPerTransaction: new Decimal(5_000_000),
    dailyLimit: new Decimal(20_000_000),
    monthlyLimit: new Decimal(100_000_000),
  },
};

/** Vérifie qu'une transaction respecte les limites du niveau KYC. */
export function checkKycLimit(
  kycLevel: KycLevel,
  amount: AmountInput,
  dailyTotal: AmountInput,
  monthlyTotal: AmountInput,
  balance: AmountInput,
): KycLimitResult {
  const limits = KYC_LIMITS[kycLevel];
  const amt = new Decimal(amount);

  if (amt.gt(limits.maxPerTransaction)) {
    return { allowed: false, reason: 'ABOVE_SINGLE_LIMIT', limits };
  }
  if (new Decimal(dailyTotal).plus(amt).gt(limits.dailyLimit)) {
    return { allowed: false, reason: 'ABOVE_DAILY_LIMIT', limits };
  }
  if (new Decimal(monthlyTotal).plus(amt).gt(limits.monthlyLimit)) {
    return { allowed: false, reason: 'ABOVE_MONTHLY_LIMIT', limits };
  }
  if (new Decimal(balance).lessThan(amt)) {
    return { allowed: false, reason: 'INSUFFICIENT_BALANCE', limits };
  }
  return { allowed: true, reason: 'OK', limits };
}

// ---------------------------------------------------------------------------
// Table de frais (spec §2.3) — pourcentage + frais minimum
// ---------------------------------------------------------------------------

interface FeeRule {
  percent: Decimal; // ex: 0.01 = 1 %
  minFee: Decimal; // frais minimum en unité mineure
}

const FEE_TABLE: Record<FeeType, FeeRule> = {
  P2P: { percent: new Decimal(0.01), minFee: new Decimal(100) },
  CASH_IN: { percent: new Decimal(0.005), minFee: new Decimal(50) },
  CASH_OUT: { percent: new Decimal(0.01), minFee: new Decimal(100) },
  BILL_PAYMENT: { percent: new Decimal(0.0075), minFee: new Decimal(75) },
  MERCHANT_PAYMENT: { percent: new Decimal(0.015), minFee: new Decimal(150) },
};

/** Calcule les frais pour un type de transaction et un montant. */
export function calculateFee(type: FeeType, amount: AmountInput): FeeResult {
  const rule = FEE_TABLE[type];
  const amt = new Decimal(amount);
  const computed = amt.times(rule.percent).toDecimalPlaces(0, Decimal.ROUND_UP);
  const fee = Decimal.max(computed, rule.minFee);
  return { feeAmount: fee };
}

// ---------------------------------------------------------------------------
// Validation téléphone (format +235 Tchad — spec §2.3)
// ---------------------------------------------------------------------------

const PHONE_RE = /^\+235\d{8}$/;

/**
 * Valide un numéro de téléphone au format international +235 (8 chiffres).
 * Extensible : liste de pays gérée par constantes.
 */
export function validatePhoneNumber(phone: string): boolean {
  if (typeof phone !== 'string') return false;
  const trimmed = phone.trim().replace(/[\s.-]/g, '');
  return PHONE_RE.test(trimmed);
}
