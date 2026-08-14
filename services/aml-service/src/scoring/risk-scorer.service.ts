/**
 * Scoring de risque AML (GOURSI-025a) — règles déterministes, score 0-100.
 * Seuil d'alerte : > 70 → AmlAlert OPEN. Règles :
 *  1. Screening sanctions (match exact/fuzzy) → +60 à +100 selon le type de match
 *  2. Montant élevé par rapport au profil (≥ 500 000 XAF) → +20
 *  3. Pays à risque (hors zone UEMOA/CEMAC de référence) → +10
 *  4. Méthode à risque (cash-out / paiement facture non référencée) → +10
 *  5. Fréquence anormale (≥ 5 transactions jour) → +10
 *  Plafonné à 100. Le score est purement fonctionnel (testable sans infra).
 */

export interface RiskInput {
  transactionId: string;
  amountMinor: string; // Decimal string — jamais de float
  type: string; // P2P | CASH_IN | CASH_OUT | BILL_PAYMENT | MERCHANT_PAYMENT
  country?: string;
  method?: string;
  todayCount?: number;
  sanctionsHit?: { kind: 'exact' | 'fuzzy'; country?: string } | null;
}

export interface RiskScore {
  score: number; // 0-100
  reasons: string[];
  alert: boolean; // score > 70
}

const AMOUNT_THRESHOLD_MINOR = 500_000; // XAF équivalent
const RISKY_TYPES = new Set(['CASH_OUT']);
const RISKY_COUNTRIES = new Set(['XX', 'ZZ']); // placeholder — configurable via env à terme
const FREQUENCY_THRESHOLD = 5;

export class RiskScorerService {
  score(input: RiskInput): RiskScore {
    const reasons: string[] = [];
    let score = 0;

    if (input.sanctionsHit) {
      if (input.sanctionsHit.kind === 'exact') {
        score += 100;
        reasons.push('MATCH_EXACT_SANCTIONS');
      } else {
        score += 60;
        reasons.push('MATCH_FUZZY_SANCTIONS');
      }
    }

    const amount = Number(input.amountMinor);
    if (Number.isFinite(amount) && amount >= AMOUNT_THRESHOLD_MINOR) {
      score += 20;
      reasons.push('HIGH_AMOUNT');
    }

    if (input.country && RISKY_COUNTRIES.has(input.country.toUpperCase())) {
      score += 10;
      reasons.push('RISKY_COUNTRY');
    }

    if (input.type && RISKY_TYPES.has(input.type.toUpperCase())) {
      score += 10;
      reasons.push('RISKY_TYPE');
    }

    if ((input.todayCount ?? 0) >= FREQUENCY_THRESHOLD) {
      score += 10;
      reasons.push('HIGH_FREQUENCY');
    }

    const capped = Math.min(100, score);
    return { score: capped, reasons, alert: capped > 70 };
  }
}
