import {
  calculateFee,
  checkKycLimit,
  FeeRounding,
  validatePhoneNumber,
  DEFAULT_KYC_LIMITS,
} from './index';

describe('validatePhoneNumber', () => {
  it('valide un numéro international E.164', () => {
    expect(validatePhoneNumber('+2250707070707')).toEqual({ valid: true, e164: '+2250707070707' });
  });

  it('tolère espaces, tirets et points', () => {
    expect(validatePhoneNumber('+225 07 07 07 07 07')).toEqual({ valid: true, e164: '+2250707070707' });
    expect(validatePhoneNumber('+225-07-07-07-07-07')).toEqual({ valid: true, e164: '+2250707070707' });
  });

  it('normalise un format local vers E.164 (défaut CI)', () => {
    expect(validatePhoneNumber('0707070707')).toEqual({ valid: true, e164: '+2250707070707' });
  });

  it('utilise le pays fourni pour le format local', () => {
    expect(validatePhoneNumber('0707070707', { country: 'SN' })).toEqual({
      valid: true,
      e164: '+2210707070707',
    });
  });

  it('rejette les chaînes vides', () => {
    expect(validatePhoneNumber('')).toEqual({ valid: false, reason: 'EMPTY' });
    expect(validatePhoneNumber('   ')).toEqual({ valid: false, reason: 'EMPTY' });
  });

  it('rejette un format international invalide', () => {
    expect(validatePhoneNumber('+225123')).toEqual({ valid: false, reason: 'INVALID_FORMAT' });
    expect(validatePhoneNumber('+abcdefghijklm')).toEqual({ valid: false, reason: 'INVALID_FORMAT' });
  });

  it('rejette un numéro local trop court', () => {
    expect(validatePhoneNumber('07070707')).toEqual({ valid: false, reason: 'INVALID_FORMAT' });
  });

  it('rejette un pays non supporté', () => {
    expect(validatePhoneNumber('0707070707', { country: 'XX' })).toEqual({
      valid: false,
      reason: 'UNSUPPORTED_COUNTRY',
    });
  });
});

describe('calculateFee', () => {
  it('calcule 1,9 % + 75 FCFA sur 25 000', () => {
    // 25000 * 190 / 10000 = 475 ; 475 + 75 = 550
    expect(calculateFee(25_000, { rateBps: 190, fixedMinor: 75 })).toBe(550);
  });

  it('arrondit half-up par défaut', () => {
    // 100 * 5 / 10000 = 0.05 → 0 (half-up) ; 150 * 5/10000 = 0.075 → 0.08 → 0
    expect(calculateFee(100, { rateBps: 5 })).toBe(0);
    expect(calculateFee(150, { rateBps: 5 })).toBe(0);
    expect(calculateFee(170, { rateBps: 5 })).toBe(0);
    // 175 * 5 / 10000 = 0.0875 → 0.09 (half up)
    expect(calculateFee(175, { rateBps: 5 })).toBe(0);
    // 1000 * 5 / 10000 = 0.5 → 1 (half up)
    expect(calculateFee(1000, { rateBps: 5 })).toBe(1);
  });

  it('respecte les modes d’arrondi UP/DOWN', () => {
    // 1000 * 5 / 10000 = 0.5
    expect(calculateFee(1000, { rateBps: 5, rounding: FeeRounding.UP })).toBe(1);
    expect(calculateFee(1000, { rateBps: 5, rounding: FeeRounding.DOWN })).toBe(0);
  });

  it('zéro de frais si taux nul et pas de fixe', () => {
    expect(calculateFee(50_000, { rateBps: 0 })).toBe(0);
  });

  it('rejette les montants invalides', () => {
    expect(() => calculateFee(-1, { rateBps: 100 })).toThrow(RangeError);
    expect(() => calculateFee(1.5, { rateBps: 100 })).toThrow(RangeError);
    expect(() => calculateFee(100, { rateBps: -1 })).toThrow(RangeError);
  });
});

describe('checkKycLimit', () => {
  it('refuse les transactions sans KYC (NONE)', () => {
    expect(checkKycLimit({ kycLevel: 'NONE', amountMinor: 100, dailyTotalMinor: 0 })).toEqual({
      allowed: false,
      reason: 'KYC_NOT_ALLOWED',
    });
  });

  it('autorise une transaction dans les plafonds', () => {
    const r = checkKycLimit({ kycLevel: 'LEVEL_1', amountMinor: 50_000, dailyTotalMinor: 0 });
    expect(r).toEqual({ allowed: true, remainingDailyMinor: 150_000 });
  });

  it('refuse au-delà du plafond par transaction', () => {
    const r = checkKycLimit({ kycLevel: 'LEVEL_1', amountMinor: 50_001, dailyTotalMinor: 0 });
    expect(r).toEqual({ allowed: false, reason: 'PER_TRANSACTION_EXCEEDED' });
  });

  it('refuse au-delà du cumul journalier', () => {
    const r = checkKycLimit({
      kycLevel: 'LEVEL_1',
      amountMinor: 10_000,
      dailyTotalMinor: 195_000,
    });
    expect(r).toEqual({ allowed: false, reason: 'DAILY_EXCEEDED' });
  });

  it('respecte les limites fournies en paramètre', () => {
    const limits = {
      ...DEFAULT_KYC_LIMITS,
      LEVEL_1: { perTransactionMinor: 1_000, dailyMinor: 5_000 },
    };
    expect(
      checkKycLimit({
        kycLevel: 'LEVEL_1',
        amountMinor: 1_001,
        dailyTotalMinor: 0,
        limits,
      }),
    ).toEqual({ allowed: false, reason: 'PER_TRANSACTION_EXCEEDED' });
  });

  it('rejette les entrées invalides', () => {
    expect(() => checkKycLimit({ kycLevel: 'LEVEL_1', amountMinor: 0, dailyTotalMinor: 0 })).toThrow(
      RangeError,
    );
    expect(() =>
      checkKycLimit({ kycLevel: 'LEVEL_1', amountMinor: 10, dailyTotalMinor: -1 }),
    ).toThrow(RangeError);
  });
});
