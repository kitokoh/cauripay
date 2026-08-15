import { describe, expect, it } from '@jest/globals';
import { RiskScorerService } from './risk-scorer.service';

describe('RiskScorerService (GOURSI-025a)', () => {
  const scorer = new RiskScorerService();

  it('transaction normale → score faible, pas d’alerte', () => {
    const r = scorer.score({ transactionId: 't1', amountMinor: '5000', type: 'P2P' });
    expect(r.score).toBe(0);
    expect(r.alert).toBe(false);
  });

  it('match sanctions exact → score 100, alerte', () => {
    const r = scorer.score({
      transactionId: 't2',
      amountMinor: '1000',
      type: 'P2P',
      sanctionsHit: { kind: 'exact', country: 'ML' },
    });
    expect(r.score).toBe(100);
    expect(r.alert).toBe(true);
    expect(r.reasons).toContain('MATCH_EXACT_SANCTIONS');
  });

  it('match fuzzy → 60 + montant élevé (20) = 80 > 70 → alerte', () => {
    const r = scorer.score({
      transactionId: 't3',
      amountMinor: '600000',
      type: 'P2P',
      sanctionsHit: { kind: 'fuzzy' },
    });
    expect(r.score).toBe(80);
    expect(r.alert).toBe(true);
  });

  it('montant élevé seul (20) → pas d’alerte (< seuil 70)', () => {
    const r = scorer.score({ transactionId: 't4', amountMinor: '900000', type: 'P2P' });
    expect(r.score).toBe(20);
    expect(r.alert).toBe(false);
  });

  it('accumulation de règles → plafonné à 100', () => {
    const r = scorer.score({
      transactionId: 't5',
      amountMinor: '700000',
      type: 'CASH_OUT',
      country: 'XX',
      todayCount: 6,
      sanctionsHit: { kind: 'fuzzy' },
    });
    expect(r.score).toBe(100);
    expect(r.alert).toBe(true);
  });
});
