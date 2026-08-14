import type { AmountMinor, CurrencyCode, KycLevel } from '@cauripay/shared-types';

// ---------------------------------------------------------------------------
// Numéros de téléphone (mobile money : UEMOA / CEMAC + international)
// ---------------------------------------------------------------------------

/** Indicatifs pays supportés — ISO 3166-1 alpha-2 → E.164. */
export const COUNTRY_CODES: Readonly<Record<string, string>> = {
  CI: '+225',
  SN: '+221',
  BF: '+226',
  BJ: '+229',
  TG: '+228',
  ML: '+223',
  NE: '+227',
  CM: '+237',
  GA: '+241',
  CG: '+242',
  CD: '+243',
  GN: '+224',
  GH: '+233',
  NG: '+234',
};

const E164_RE = /^\+[1-9]\d{6,14}$/;
/** Format local commun à la zone : 0 suivi de 8 à 9 chiffres (ex. CI : 0707070707). */
const LOCAL_RE = /^0\d{8,9}$/;

export interface PhoneValidationResult {
  valid: boolean;
  /** Numéro normalisé au format E.164, si valide. */
  e164?: string;
  reason?: 'EMPTY' | 'INVALID_FORMAT' | 'UNSUPPORTED_COUNTRY';
}

/**
 * Valide et normalise un numéro de téléphone.
 * - Format international (`+2250707070707`) : validé directement.
 * - Format local (`0707070707`) : normalisé vers E.164 via `country` (défaut : CI).
 */
export function validatePhoneNumber(phone: string, opts: { country?: string } = {}): PhoneValidationResult {
  if (!phone || phone.trim() === '') return { valid: false, reason: 'EMPTY' };

  const cleaned = phone.replace(/[\s.\-()]/g, '');
  if (cleaned.startsWith('+')) {
    return E164_RE.test(cleaned)
      ? { valid: true, e164: cleaned }
      : { valid: false, reason: 'INVALID_FORMAT' };
  }

  const country = (opts.country ?? 'CI').toUpperCase();
  const prefix = COUNTRY_CODES[country];
  if (!prefix) return { valid: false, reason: 'UNSUPPORTED_COUNTRY' };

  if (!LOCAL_RE.test(cleaned)) return { valid: false, reason: 'INVALID_FORMAT' };
  // Le 0 initial est significatif dans la zone (07…, 05…, 01…) : on le conserve.
  const e164 = prefix + cleaned;
  return E164_RE.test(e164) ? { valid: true, e164 } : { valid: false, reason: 'INVALID_FORMAT' };
}

// ---------------------------------------------------------------------------
// Calcul de frais
// ---------------------------------------------------------------------------

export const FeeRounding = {
  HALF_UP: 'HALF_UP',
  UP: 'UP',
  DOWN: 'DOWN',
} as const;
export type FeeRounding = (typeof FeeRounding)[keyof typeof FeeRounding];

export interface FeeConfig {
  /** Taux en points de base (1 % = 100 bps). */
  rateBps: number;
  /** Frais fixes en unités mineures (défaut : 0). */
  fixedMinor?: AmountMinor;
  rounding?: FeeRounding;
}

/** Arrondi entier (unité mineure). Défaut : HALF_UP (standard bancaire pour les frais). */
function round(n: number, mode: FeeRounding): number {
  if (mode === FeeRounding.UP) return Math.ceil(n);
  if (mode === FeeRounding.DOWN) return Math.floor(n);
  return Math.round(n); // half up
}

/**
 * Calcule les frais d'une transaction.
 * `fee = amountMinor * rateBps / 10000 + fixedMinor`, arrondi à l'unité mineure.
 */
export function calculateFee(amountMinor: AmountMinor, config: FeeConfig): AmountMinor {
  if (!Number.isInteger(amountMinor) || amountMinor < 0) {
    throw new RangeError('amountMinor doit être un entier >= 0');
  }
  if (!Number.isInteger(config.rateBps) || config.rateBps < 0) {
    throw new RangeError('rateBps doit être un entier >= 0');
  }
  const variable = (amountMinor * config.rateBps) / 10_000;
  const fixed = config.fixedMinor ?? 0;
  if (!Number.isInteger(fixed) || fixed < 0) throw new RangeError('fixedMinor doit être un entier >= 0');
  return round(variable + fixed, config.rounding ?? FeeRounding.HALF_UP);
}

// ---------------------------------------------------------------------------
// Limites KYC
// ---------------------------------------------------------------------------

export interface KycLimits {
  /** Plafond par transaction (unités mineures). */
  perTransactionMinor: AmountMinor;
  /** Plafond cumulé journalier (unités mineures). */
  dailyMinor: AmountMinor;
}

export type KycLimitMap = Readonly<Record<KycLevel, KycLimits>>;

/** Limites par défaut (XOF/XAF — à affiner en config par devise). */
export const DEFAULT_KYC_LIMITS: KycLimitMap = {
  NONE: { perTransactionMinor: 0, dailyMinor: 0 },
  LEVEL_1: { perTransactionMinor: 50_000, dailyMinor: 200_000 },
  LEVEL_2: { perTransactionMinor: 500_000, dailyMinor: 2_000_000 },
  LEVEL_3: { perTransactionMinor: 5_000_000, dailyMinor: 20_000_000 },
};

export interface KycLimitCheckInput {
  kycLevel: KycLevel;
  amountMinor: AmountMinor;
  /** Total déjà consommé aujourd'hui (hors transaction courante). */
  dailyTotalMinor: AmountMinor;
  limits?: KycLimitMap;
}

export type KycLimitRejection = 'KYC_NOT_ALLOWED' | 'PER_TRANSACTION_EXCEEDED' | 'DAILY_EXCEEDED';

export interface KycLimitResult {
  allowed: boolean;
  reason?: KycLimitRejection;
  /** Restant disponible aujourd'hui si autorisé. */
  remainingDailyMinor?: AmountMinor;
}

/**
 * Vérifie qu'une transaction respecte les plafonds liés au niveau KYC.
 * - Niveau NONE : aucune transaction autorisée.
 * - Plafond par transaction et cumul journalier.
 */
export function checkKycLimit(input: KycLimitCheckInput): KycLimitResult {
  const { kycLevel, amountMinor, dailyTotalMinor } = input;
  const limits = input.limits ?? DEFAULT_KYC_LIMITS;

  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    throw new RangeError('amountMinor doit être un entier > 0');
  }
  if (!Number.isInteger(dailyTotalMinor) || dailyTotalMinor < 0) {
    throw new RangeError('dailyTotalMinor doit être un entier >= 0');
  }

  const level = limits[kycLevel];
  if (!level || level.perTransactionMinor <= 0) {
    return { allowed: false, reason: 'KYC_NOT_ALLOWED' };
  }
  if (amountMinor > level.perTransactionMinor) {
    return { allowed: false, reason: 'PER_TRANSACTION_EXCEEDED' };
  }
  if (dailyTotalMinor + amountMinor > level.dailyMinor) {
    return { allowed: false, reason: 'DAILY_EXCEEDED' };
  }
  return { allowed: true, remainingDailyMinor: level.dailyMinor - dailyTotalMinor - amountMinor };
}

export type { AmountMinor, CurrencyCode };
