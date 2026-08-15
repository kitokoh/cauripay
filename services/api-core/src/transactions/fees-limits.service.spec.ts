import { FeesService, LimitsService } from './fees-limits.service';
import { KycLevel, TransactionType } from '@goursi/shared-types';

describe('FeesService', () => {
  const service = new FeesService();

  it("P2P 10 000 → 100.00 (1 %)", () => {
    expect(service.calculate(TransactionType.P2P, '10000').feeAmount).toBe('100.00');
  });

  it('CASH_IN gratuit', () => {
    expect(service.calculate(TransactionType.CASH_IN, '50000').feeAmount).toBe('0.00');
  });
});

describe('LimitsService', () => {
  const service = new LimitsService();

  it("BASIC 60 000 → refusé (plafond)", () => {
    expect(service.check(KycLevel.BASIC, '60000', '0', '0', '0').allowed).toBe(false);
  });

  it('VERIFIED gros montant OK', () => {
    expect(service.check(KycLevel.VERIFIED, '400000', '0', '0', '0').allowed).toBe(true);
  });

  it('dépassement quotidien → DAILY_LIMIT', () => {
    const res = service.check(KycLevel.BASIC, '10000', '45000', '0', '0');
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe('DAILY_LIMIT');
  });
});
