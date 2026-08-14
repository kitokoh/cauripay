import { Injectable } from '@nestjs/common';

/**
 * Score de risque AML — DÉTERMINISTE et testable (GOURSI-025a).
 * Règles pondérées (montant, méthode, fréquence, pays, historique) → 0-100.
 * Seuil d'alerte : > 70 (spec). Aucune valeur aléatoire.
 */
@Injectable()
export class RiskScorerService {
  static readonly ALERT_THRESHOLD = 70;

  private static readonly AMOUNT_TIERS: Array<[number, number]> = [
    [5_000_000, 50], // >= 5 M FCFA
    [2_000_000, 30],
    [1_000_000, 20],
    [500_000, 12],
    [200_000, 6],
    [0, 0],
  ];

  private static readonly HIGH_RISK_METHODS = new Set(['international', 'card']);
  private static readonly HIGH_RISK_COUNTRIES = new Set(['KP', 'IR', 'SY', 'CU', 'VE']);

  /**
   * @param amountMinor  montant en unités mineures (XOF)
   * @param method       méthode de paiement
   * @param countryIso   pays ISO 3166-1 alpha-2 (optionnel)
   * @param txnCount24h  nombre de transactions sur 24 h (fréquence)
   * @param pastAlerts   alertes passées sur le wallet
   */
  score(
    amountMinor: number,
    method: string,
    countryIso?: string | null,
    txnCount24h = 1,
    pastAlerts = 0,
  ): number {
    let score = 0;

    // 1. Montant (0-30)
    for (const [threshold, points] of RiskScorerService.AMOUNT_TIERS) {
      if (amountMinor >= threshold) {
        score += points;
        break;
      }
    }

    // 2. Méthode (0-25)
    if (RiskScorerService.HIGH_RISK_METHODS.has(method)) {
      score += 25;
    }

    // 3. Pays (0-25)
    if (countryIso && RiskScorerService.HIGH_RISK_COUNTRIES.has(countryIso.toUpperCase())) {
      score += 25;
    }

    // 4. Fréquence (0-35) : > 10 tx/24h → 35 ; > 5 → 20 ; > 2 → 8
    if (txnCount24h > 10) {
      score += 35;
    } else if (txnCount24h > 5) {
      score += 20;
    } else if (txnCount24h > 2) {
      score += 8;
    }

    // 5. Historique (0-15)
    if (pastAlerts > 2) {
      score += 15;
    } else if (pastAlerts > 0) {
      score += 8;
    }

    return Math.min(score, 100);
  }

  isAlert(score: number): boolean {
    return score > RiskScorerService.ALERT_THRESHOLD;
  }

  severityOf(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score > 90) {
      return 'CRITICAL';
    }
    if (score > 80) {
      return 'HIGH';
    }
    if (score > 70) {
      return 'MEDIUM';
    }
    return 'LOW';
  }
}
