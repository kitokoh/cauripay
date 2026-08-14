import { RiskScorerService } from './risk-scorer.service';

describe('RiskScorerService (GOURSI-025a) — déterministe et testable', () => {
  const scorer = new RiskScorerService();

  it('score faible pour un petit P2P local', () => {
    const score = scorer.score(50_000, 'mobile_money', 'CI', 1, 0);
    expect(score).toBeLessThanOrEqual(RiskScorerService.ALERT_THRESHOLD);
    expect(scorer.isAlert(score)).toBe(false);
  });

  it('score élevé pour un gros montant international', () => {
    const score = scorer.score(5_000_000, 'international', 'FR', 1, 0);
    expect(score).toBeGreaterThan(RiskScorerService.ALERT_THRESHOLD);
    expect(scorer.isAlert(score)).toBe(true);
  });

  it('combinaison fréquence + méthode + historique → alerte', () => {
    // Aucun facteur unique ne suffit : c'est la combinaison qui déclenche (politique AML)
    expect(scorer.isAlert(scorer.score(300_000, 'mobile_money', 'CI', 15, 0))).toBe(false);
    const score = scorer.score(300_000, 'card', 'CI', 15, 1);
    expect(scorer.isAlert(score)).toBe(true);
  });

  it('gros montant + pays à risque → alerte (OFAC-like)', () => {
    expect(scorer.isAlert(scorer.score(5_000_000, 'mobile_money', 'KP', 1, 0))).toBe(true);
  });

  it('un seul facteur élevé ne suffit pas (seuil combinatoire)', () => {
    expect(scorer.isAlert(scorer.score(2_000_000, 'mobile_money', 'CI', 1, 0))).toBe(false);
    expect(scorer.isAlert(scorer.score(100_000, 'international', 'FR', 1, 0))).toBe(false);
  });

  it('déterministe : même entrée → même score', () => {
    const a = scorer.score(750_000, 'card', 'SN', 4, 1);
    const b = scorer.score(750_000, 'card', 'SN', 4, 1);
    expect(a).toBe(b);
  });

  it('seuils de sévérité', () => {
    expect(scorer.severityOf(95)).toBe('CRITICAL');
    expect(scorer.severityOf(85)).toBe('HIGH');
    expect(scorer.severityOf(75)).toBe('MEDIUM');
    expect(scorer.severityOf(30)).toBe('LOW');
  });
});
