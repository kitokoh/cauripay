import { checkKycLimit, calculateFee, validatePhoneNumber, Decimal } from '../index';

describe('checkKycLimit', () => {
  it('refuse un montant au-dessus de la limite unitaire BASIC', () => {
    const r = checkKycLimit('BASIC', 60000, 0, 0, 0);
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('ABOVE_SINGLE_LIMIT');
  });

  it('accepte un montant dans les limites BASIC', () => {
    const r = checkKycLimit('BASIC', 40000, 0, 0, 100000);
    expect(r.allowed).toBe(true);
    expect(r.reason).toBe('OK');
  });

  it('refuse quand le total journalier est dépassé', () => {
    const r = checkKycLimit('VERIFIED', 100000, 1950000, 0, 999999999);
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('ABOVE_DAILY_LIMIT');
  });

  it('refuse quand le total mensuel est dépassé', () => {
    const r = checkKycLimit('PREMIUM', 5000000, 0, 99000000, 999999999);
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('ABOVE_MONTHLY_LIMIT');
  });

  it('refuse en cas de solde insuffisant', () => {
    const r = checkKycLimit('BASIC', 10000, 0, 0, 5000);
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('INSUFFICIENT_BALANCE');
  });

  it('calcule les limites exposées', () => {
    const r = checkKycLimit('BASIC', 10000, 0, 0, 100000);
    expect(r.limits?.maxPerTransaction.toNumber()).toBe(50000);
  });
});

describe('calculateFee', () => {
  it('calcule 1% pour P2P : 10000 → 100', () => {
    const r = calculateFee('P2P', 10000);
    expect(r.feeAmount.toNumber()).toBe(100);
  });

  it('applique le frais minimum quand le pourcentage est plus bas', () => {
    const r = calculateFee('P2P', 100);
    expect(r.feeAmount.toNumber()).toBe(100);
  });

  it('arrondit à l’unité supérieure', () => {
    const r = calculateFee('MERCHANT_PAYMENT', 10000);
    expect(r.feeAmount.toNumber()).toBe(150);
  });

  it('utilise Decimal et ne produit jamais de float', () => {
    const r = calculateFee('CASH_OUT', 3333);
    expect(r.feeAmount).toBeInstanceOf(Decimal);
    expect(Number.isInteger(r.feeAmount.toNumber())).toBe(true);
  });
});

describe('validatePhoneNumber', () => {
  it('accepte un numéro +235 valide', () => {
    expect(validatePhoneNumber('+23566000001')).toBe(true);
  });

  it('rejette un mauvais indicatif', () => {
    expect(validatePhoneNumber('+3366000001')).toBe(false);
  });

  it('rejette une longueur incorrecte', () => {
    expect(validatePhoneNumber('+2356600000')).toBe(false);
  });

  it('rejette les caractères non numériques', () => {
    expect(validatePhoneNumber('+23566a00001')).toBe(false);
  });

  it('rejette les entrées non-string', () => {
    // @ts-expect-error — test de robustesse runtime
    expect(validatePhoneNumber(12345)).toBe(false);
  });
});
