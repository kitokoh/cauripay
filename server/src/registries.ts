/**
 * Registres produits : devises et méthodes de paiement (v0.1 sandbox).
 * Ces registres pilotent la validation de l'API et le simulateur.
 */

export interface CurrencyDef {
  code: string;
  name: string;
  decimals: number;
  countries: string[];
}

export const CURRENCIES: CurrencyDef[] = [
  { code: 'XOF', name: 'Franc CFA (UEMOA)', decimals: 0, countries: ['CI', 'SN', 'ML', 'BF', 'NE', 'BJ', 'TG', 'GW'] },
  { code: 'XAF', name: 'Franc CFA (CEMAC)', decimals: 0, countries: ['CM', 'GA', 'CG', 'TD', 'CF', 'GQ'] },
  { code: 'GNF', name: 'Franc guinéen', decimals: 0, countries: ['GN'] },
  { code: 'CDF', name: 'Franc congolais', decimals: 0, countries: ['CD'] },
  { code: 'NGN', name: 'Naira nigérian', decimals: 2, countries: ['NG'] },
  { code: 'GHS', name: 'Cedi ghanéen', decimals: 2, countries: ['GH'] },
  { code: 'EUR', name: 'Euro', decimals: 2, countries: ['EU'] },
  { code: 'USD', name: 'Dollar américain', decimals: 2, countries: ['US', 'INTL'] },
];

export const currencyByCode = (code: string): CurrencyDef | undefined =>
  CURRENCIES.find((c) => c.code === code.toUpperCase());

export interface MethodDef {
  id: string;
  label: string;
  kind: 'mobile_money' | 'card' | 'international';
  countries: string[];
  emoji: string;
  hint: string;
}

export const METHODS: MethodDef[] = [
  { id: 'orange_money', label: 'Orange Money', kind: 'mobile_money', countries: ['CI', 'SN', 'ML', 'BF', 'NE', 'CM', 'GA', 'CG', 'CD'], emoji: '🟠', hint: 'Flux simulé : téléphone → PIN' },
  { id: 'mtn_momo', label: 'MTN Mobile Money', kind: 'mobile_money', countries: ['CI', 'CM', 'GH', 'BJ', 'UG'], emoji: '🟡', hint: 'Flux simulé : téléphone → PIN' },
  { id: 'moov_money', label: 'Moov Money', kind: 'mobile_money', countries: ['CI', 'BJ', 'TG'], emoji: '🔵', hint: 'Flux simulé : téléphone → PIN' },
  { id: 'wave', label: 'Wave', kind: 'mobile_money', countries: ['SN', 'CI', 'ML'], emoji: '🌊', hint: 'Flux simulé : téléphone → PIN' },
  { id: 'card', label: 'Carte bancaire (Visa / Mastercard)', kind: 'card', countries: ['INTL'], emoji: '💳', hint: 'Simulé — aucun PAN stocké (PCI-DSS)' },
  { id: 'international', label: 'Paiement international', kind: 'international', countries: ['INTL'], emoji: '🌍', hint: 'Virement / SEPA / cartes internationales (simulé)' },
];

export const methodById = (id: string): MethodDef | undefined => METHODS.find((m) => m.id === id);

export const ALL_METHOD_IDS = METHODS.map((m) => m.id);
