import {
  calculateFee,
  checkKycLimit,
  validatePhoneNumber,
  KYC_LIMITS,
  Decimal,
} from '../index';
import { KycLevel, TransactionType } from '@goursi/shared-types';

describe('validatePhoneNumber (+235)', () => {
  it("accepte '+23566000001'", () => {
    expect(validatePhoneNumber('+23566000001')).toBe(true);
  });

  it('accepte un numéro avec espaces', () => {
    expect(validatePhoneNumber(' +23566000001 ')).toBe(true);
  });

  it('refuse un préfixe étranger', () => {
    expect(validatePhoneNumber('+33660000001')).toBe(false);
  });

  it('refuse une longueur incorrecte', () => {
    expect(validatePhoneNumber('+2356600000')).toBe(false);
    expect(validatePhoneNumber('+235660000012')).toBe(false);
  });

  it('refuse les non-chiffres', () => {
    expect(validatePhoneNumber('+2356600000a')).toBe(false);
  });

  it('refuse les valeurs non-string', () => {
    expect(validatePhoneNumber(null as unknown as string)).toBe(false);
    expect(validatePhoneNumber(undefined as unknown as string)).toBe(false);
  });
});

describe('calculateFee', () => {
  it("P2P 10 000 → 100 (1 %) — critère d'acceptation", () => {
    expect(calculateFee(TransactionType.P2P, '10000').feeAmount).toBe('100.00');
  });

  it('CASH_IN est gratuit', () => {
    expect(calculateFee(TransactionType.CASH_IN, '50000').feeAmount).toBe('0.00');
  });

  it('arrondit à l’échelle 2 (HALF_UP)', () => {
    // 1 % de 123,45 → 1,2345 → 1,23
    expect(calculateFee(TransactionType.P2P, '123.45').feeAmount).toBe('1.23');
    // 1 % de 0,05 → 0,0005 → 0,00
    expect(calculateFee(TransactionType.P2P, '0.05').feeAmount).toBe('0.00');
  });

  it('expose une décomposition (breakdown)', () => {
    const res = calculateFee(TransactionType.MERCHANT_PAYMENT, '10000');
    expect(res.breakdown.ratePercent).toBe('0.8');
    expect(res.breakdown.base).toBe("80.00");
  });

  it("refuse montant <= 0", () => {
    expect(() => calculateFee(TransactionType.P2P, '0')).toThrow();
    expect(() => calculateFee(TransactionType.P2P, '-5')).toThrow();
  });

  it('accepte un Decimal en entrée', () => {
    expect(calculateFee(TransactionType.P2P, new Decimal('20000')).feeAmount).toBe('200.00');
  });
});

describe('checkKycLimit', () => {
  it("BASIC 60 000 → refusé — critère d'acceptation", () => {
    expect(checkKycLimit(KycLevel.BASIC, '60000', '0', '0', '0').allowed).toBe(false);
  });

  it('BASIC 50 000 → autorisé (plafond exact)', () => {
    expect(checkKycLimit(KycLevel.BASIC, '50000', '0', '0', '0').allowed).toBe(true);
  });

  it('BASIC avec dailyTotal consommé → refus DAILY_LIMIT', () => {
    const res = checkKycLimit(KycLevel.BASIC, '10000', '45000', '0', '0');
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe('DAILY_LIMIT');
  });

  it('VERIFIED avec monthlyTotal consommé → refus MONTHLY_LIMIT', () => {
    const res = checkKycLimit(KycLevel.VERIFIED, '60000', '0', '2950000', '0');
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe('MONTHLY_LIMIT');
  });

  it('MAX_BALANCE dépassé → refus', () => {
    const res = checkKycLimit(KycLevel.BASIC, '10000', '0', '0', '495000');
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe('MAX_BALANCE');
  });

  it('MAX_PER_TRANSACTION dépassé → refus', () => {
    const res = checkKycLimit(KycLevel.BASIC, '50001', '0', '0', '0');
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe('MAX_PER_TRANSACTION');
  });

  it('PREMIUM autorise de gros montants', () => {
    expect(checkKycLimit(KycLevel.PREMIUM, '4500000', '0', '0', '0').allowed).toBe(true);
  });

  it('les plafonds sont ordonnés BASIC < VERIFIED < PREMIUM', () => {
    expect(KYC_LIMITS[KycLevel.BASIC].dailyMax.lessThan(KYC_LIMITS[KycLevel.VERIFIED].dailyMax)).toBe(true);
    expect(KYC_LIMITS[KycLevel.VERIFIED].dailyMax.lessThan(KYC_LIMITS[KycLevel.PREMIUM].dailyMax)).toBe(true);
  });
});
