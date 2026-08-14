// Registres devises/méthodes — source de vérité = l'API CauriPay (/api/v1/currencies, /api/v1/methods).
// Le dashboard ne duplique plus les registres : il les charge au démarrage.
// Fallback statique minimal (hors-ligne / serveur indisponible), clairement marqué.

export interface CurrencyDef {
  code: string;
  name: string;
  decimals: number;
  countries: string[];
}

export interface MethodDef {
  id: string;
  label: string;
  kind: string;
  countries: string[];
  emoji: string;
  hint: string;
}

// Fallback (uniquement si l'API est injoignable) — ne PAS éditer sans toucher au serveur.
const FALLBACK_CURRENCIES: CurrencyDef[] = [
  { code: 'XOF', name: 'Franc CFA (UEMOA)', decimals: 0, countries: [] },
  { code: 'XAF', name: 'Franc CFA (CEMAC)', decimals: 0, countries: [] },
  { code: 'GNF', name: 'Franc guinéen', decimals: 0, countries: [] },
  { code: 'CDF', name: 'Franc congolais', decimals: 0, countries: [] },
  { code: 'NGN', name: 'Naira nigérian', decimals: 2, countries: [] },
  { code: 'GHS', name: 'Cedi ghanéen', decimals: 2, countries: [] },
  { code: 'EUR', name: 'Euro', decimals: 2, countries: [] },
  { code: 'USD', name: 'Dollar américain', decimals: 2, countries: [] },
];

const FALLBACK_METHODS: MethodDef[] = [
  { id: 'orange_money', label: 'Orange Money', kind: 'mobile_money', countries: [], emoji: '🟠', hint: '' },
  { id: 'mtn_momo', label: 'MTN Mobile Money', kind: 'mobile_money', countries: [], emoji: '🟡', hint: '' },
  { id: 'moov_money', label: 'Moov Money', kind: 'mobile_money', countries: [], emoji: '🔵', hint: '' },
  { id: 'wave', label: 'Wave', kind: 'mobile_money', countries: [], emoji: '🌊', hint: '' },
  { id: 'card', label: 'Carte bancaire (Visa / Mastercard)', kind: 'card', countries: [], emoji: '💳', hint: '' },
  { id: 'international', label: 'Paiement international', kind: 'international', countries: [], emoji: '🌍', hint: '' },
];

let currencies: CurrencyDef[] = FALLBACK_CURRENCIES;
let methods: MethodDef[] = FALLBACK_METHODS;
let loaded = false;

/** Charge les registres depuis l'API (idempotent). Appelé au démarrage de l'app. */
export async function loadRegistries(): Promise<void> {
  if (loaded) return;
  try {
    const [cur, met] = await Promise.all([
      fetch('/api/v1/currencies').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/v1/methods').then((r) => (r.ok ? r.json() : null)),
    ]);
    if (Array.isArray(cur?.currencies) && cur.currencies.length > 0) currencies = cur.currencies;
    if (Array.isArray(met?.methods) && met.methods.length > 0) methods = met.methods;
    loaded = true;
  } catch {
    // serveur injoignable → fallback statique
  }
}

export function currencyByCode(code: string): CurrencyDef | undefined {
  return currencies.find((c) => c.code === code);
}

export function currencyCodes(): string[] {
  return currencies.map((c) => c.code);
}

export function methodById(id: string): MethodDef | undefined {
  return methods.find((m) => m.id === id);
}

export function methodMap(): Record<string, { label: string; emoji: string }> {
  return Object.fromEntries(methods.map((m) => [m.id, { label: m.label, emoji: m.emoji }]));
}
