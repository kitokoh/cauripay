/**
 * Screening des listes de sanctions (GOURSI-025b) — OFAC / ONU / GABAC.
 * Fixtures embarquées (jeu de données représentatif) — les listes réelles
 * seront chargées périodiquement (source configurable) sans changer le contrat.
 *
 * Normalisation : Unicode NFD (diacritiques décomposées) + minuscules + trim —
 * un nom listé "IBRAHIM KONE" matche "Ibrahïm Koné" (exact après normalisation).
 * Fuzzy : Jaccard sur les tokens normalisés (seuil 0.6) — déterministe, sans dépendance.
 */

export interface SanctionedEntity {
  name: string;
  country?: string;
  list: 'OFAC' | 'UN' | 'GABAC';
  aliases?: string[];
}

export interface ScreeningResult {
  hit: boolean;
  kind: 'exact' | 'fuzzy' | null;
  matchedEntity?: SanctionedEntity;
  confidence?: number;
  /** true/false quand l'entité listée porte un pays et qu'il est comparé. */
  countryMatched?: boolean;
}

// Fixtures représentatives (dev/staging). Sources réelles : OFAC SDN, ONU, GABAC.
export const SANCTION_FIXTURES: SanctionedEntity[] = [
  { name: 'IBRAHIM KONÉ', country: 'ML', list: 'GABAC', aliases: ['Ibrahima Kone'] },
  { name: 'JEAN-PIERRE MBOUMBA', country: 'CG', list: 'UN' },
  { name: 'FATOU DIALLO', country: 'SN', list: 'OFAC' },
  { name: 'HAMADOU TAMBA', country: 'BF', list: 'GABAC' },
  { name: 'NGUEMA ESSONO', country: 'GA', list: 'UN' },
];

export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // supprime les diacritiques décomposées
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function tokenize(name: string): string[] {
  return normalizeName(name).split(/\s+/).filter(Boolean);
}

/** Similarité de Jaccard sur les tokens (0 = disjoint, 1 = identique). */
export function tokenJaccard(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b);
  const intersection = a.filter((t) => setB.has(t)).length;
  const union = new Set([...a, ...b]).size;
  return intersection / union;
}

/** Distance de Levenshtein (déterministe, sans dépendance). */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const dp: number[] = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

/** Similarité caractère normalisée : 1 - dist/max(len) ∈ [0, 1]. */
export function charSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

export class ListScreenerService {
  constructor(private readonly lists: SanctionedEntity[] = SANCTION_FIXTURES) {}

  /**
   * Screening d'un nom + pays.
   * 1) EXACT : nom normalisé identique à une entité ou un alias (le pays est
   *    informatif — un nom identique frappe, même si le pays diffère : en AML,
   *    une fausse négative coûte plus cher qu'un signal à vérifier).
   * 2) FUZZY : Jaccard tokens ≥ 0.6 OU similarité caractères ≥ 0.75.
   */
  screen(name: string, country?: string): ScreeningResult {
    const normalized = normalizeName(name);
    const tokens = tokenize(name);
    if (tokens.length === 0) return { hit: false, kind: null };

    // 1) Exact (nom ou alias normalisés).
    const exact = this.lists.find((e) => normalizeName(e.name) === normalized);
    if (exact) {
      return {
        hit: true,
        kind: 'exact',
        matchedEntity: exact,
        confidence: 1,
        countryMatched: exact.country ? exact.country.toUpperCase() === (country ?? '').toUpperCase() : undefined,
      };
    }
    for (const e of this.lists) {
      const aliasHit = (e.aliases ?? []).some((a) => normalizeName(a) === normalized);
      if (aliasHit) {
        return {
          hit: true,
          kind: 'exact',
          matchedEntity: e,
          confidence: 1,
          countryMatched: e.country ? e.country.toUpperCase() === (country ?? '').toUpperCase() : undefined,
        };
      }
    }

    // 2) Fuzzy : meilleur score parmi (Jaccard tokens, similarité caractères).
    let best: { entity: SanctionedEntity; sim: number } | null = null;
    for (const e of this.lists) {
      const candidates = [e.name, ...(e.aliases ?? [])];
      for (const cand of candidates) {
        const jac = tokenJaccard(tokens, tokenize(cand));
        const chr = charSimilarity(normalized, normalizeName(cand));
        const sim = Math.max(jac, chr);
        // Fuzzy : tokens partagés ≥ 0.6 OU similarité caractères ≥ 0.75 (typographies proches).
        if ((jac >= 0.6 || chr >= 0.75) && (!best || sim > best.sim)) {
          best = { entity: e, sim };
        }
      }
    }
    if (best) {
      return {
        hit: true,
        kind: 'fuzzy',
        matchedEntity: best.entity,
        confidence: best.sim,
        countryMatched: best.entity.country ? best.entity.country.toUpperCase() === (country ?? '').toUpperCase() : undefined,
      };
    }

    return { hit: false, kind: null };
  }
}
