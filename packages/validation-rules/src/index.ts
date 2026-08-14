/**
 * @goursi/validation-rules — règles financières universelles, testées UNE seule fois,
 * réutilisées par api-core et business-service.
 * Règle : les montants sont des Decimal (string) — jamais de float.
 */
import Decimal from 'decimal.js';
import { EntryType, KycLevel, TransactionType } from '@goursi/shared-types';

// ── Téléphone (+235, Tchad) ───────────────────────────────────────────────────

const PHONE_RE = /^\+235[0-9]{8}$/;

/** Valide un numéro de téléphone au format +235XXXXXXXX (8 chiffres). */
export function validatePhoneNumber(phone: string): boolean {
  if (typeof phone !== 'string') return false;
  return PHONE_RE.test(phone.trim());
}

// ── Frais (spec §2.3) ─────────────────────────────────────────────────────────

export interface FeeTableEntry {
  /** Taux en pourcentage (ex. 1 = 1 %) appliqué au montant. */
  ratePercent: Decimal;
  /** Frais fixe en unité mineure (string Decimal). */
  fixed: Decimal;
}

/** Table de frais par type de transaction (unité mineure, échelle 2). */
export const FEE_TABLE: Record<TransactionType, FeeTableEntry> = {
  [TransactionType.P2P]: { ratePercent: new Decimal(1), fixed: new Decimal(0) },
  [TransactionType.CASH_IN]: { ratePercent: new Decimal(0), fixed: new Decimal(0) },
  [TransactionType.CASH_OUT]: { ratePercent: new Decimal(1), fixed: new Decimal(0) },
  [TransactionType.BILL_PAYMENT]: { ratePercent: new Decimal(0.5), fixed: new Decimal(0) },
  [TransactionType.MERCHANT_PAYMENT]: { ratePercent: new Decimal(0.8), fixed: new Decimal(0) },
};

export interface FeeResult {
  /** Montant de la commission en string Decimal, échelle 2, arrondi HALF_UP. */
  feeAmount: string;
  /** Décomposition (base + commission) pour metadata. */
  breakdown: { ratePercent: string; fixed: string; base: string };
}

/**
 * Calcule la commission d'un type de transaction.
 * feeAmount = round(amount × ratePercent / 100 + fixed, 2, HALF_UP)
 */
export function calculateFee(type: TransactionType, amount: string | Decimal): FeeResult {
  const amt = amount instanceof Decimal ? amount : new Decimal(amount);
  if (amt.isNegative() || amt.isZero()) {
    throw new Error(`calculateFee: amount doit être > 0 (reçu ${amount})`);
  }
  const entry = FEE_TABLE[type];
  if (!entry) {
    throw new Error(`calculateFee: type de transaction inconnu (${type})`);
  }
  const base = amt.times(entry.ratePercent).div(100);
  const feeAmount = base.plus(entry.fixed).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  // Format canonique : string à l'échelle 2 ('100.00') — jamais float.
  return {
    feeAmount: feeAmount.toFixed(2),
    breakdown: {
      ratePercent: entry.ratePercent.toString(),
      fixed: entry.fixed.toString(),
      base: base.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2),
    },
  };
}

// ── Limites KYC (COBAC) ───────────────────────────────────────────────────────

export interface KycLimits {
  dailyMax: Decimal;
  monthlyMax: Decimal;
  maxBalance: Decimal;
  maxPerTransaction: Decimal;
}

/** Plafonds par niveau KYC (unités mineures). BASIC refuse 60 000 (critère d'acceptation). */
export const KYC_LIMITS: Record<KycLevel, KycLimits> = {
  [KycLevel.BASIC]: {
    dailyMax: new Decimal(50_000),
    monthlyMax: new Decimal(300_000),
    maxBalance: new Decimal(500_000),
    maxPerTransaction: new Decimal(50_000),
  },
  [KycLevel.VERIFIED]: {
    dailyMax: new Decimal(500_000),
    monthlyMax: new Decimal(3_000_000),
    maxBalance: new Decimal(5_000_000),
    maxPerTransaction: new Decimal(500_000),
  },
  [KycLevel.PREMIUM]: {
    dailyMax: new Decimal(5_000_000),
    monthlyMax: new Decimal(30_000_000),
    maxBalance: new Decimal(50_000_000),
    maxPerTransaction: new Decimal(5_000_000),
  },
};

export interface KycLimitCheck {
  allowed: boolean;
  reason?: 'DAILY_LIMIT' | 'MONTHLY_LIMIT' | 'MAX_BALANCE' | 'MAX_PER_TRANSACTION' | 'OK';
}

/**
 * Vérifie qu'une opération respecte les limites du niveau KYC.
 * @param kycLevel niveau du wallet source
 * @param amount montant de l'opération (string Decimal)
 * @param dailyTotal total déjà consommé aujourd'hui
 * @param monthlyTotal total déjà consommé ce mois
 * @param balance solde du wallet source
 */
export function checkKycLimit(
  kycLevel: KycLevel,
  amount: string | Decimal,
  dailyTotal: string | Decimal = '0',
  monthlyTotal: string | Decimal = '0',
  balance: string | Decimal = '0',
): KycLimitCheck {
  const amt = amount instanceof Decimal ? amount : new Decimal(amount);
  const daily = dailyTotal instanceof Decimal ? dailyTotal : new Decimal(dailyTotal);
  const monthly = monthlyTotal instanceof Decimal ? monthlyTotal : new Decimal(monthlyTotal);
  const bal = balance instanceof Decimal ? balance : new Decimal(balance);
  const limits = KYC_LIMITS[kycLevel];

  if (amt.greaterThan(limits.maxPerTransaction)) {
    return { allowed: false, reason: 'MAX_PER_TRANSACTION' };
  }
  if (daily.plus(amt).greaterThan(limits.dailyMax)) {
    return { allowed: false, reason: 'DAILY_LIMIT' };
  }
  if (monthly.plus(amt).greaterThan(limits.monthlyMax)) {
    return { allowed: false, reason: 'MONTHLY_LIMIT' };
  }
  if (bal.plus(amt).greaterThan(limits.maxBalance)) {
    return { allowed: false, reason: 'MAX_BALANCE' };
  }
  return { allowed: true, reason: 'OK' };
}

/** Mapping type de transaction → EntryType utilisé côté ledger pour les frais. */
export function feeEntryTypeFor(type: TransactionType): EntryType {
  switch (type) {
    case TransactionType.P2P:
    case TransactionType.CASH_OUT:
    case TransactionType.BILL_PAYMENT:
    case TransactionType.MERCHANT_PAYMENT:
      return EntryType.FEE;
    default:
      return EntryType.FEE;
  }
}

export { Decimal };
