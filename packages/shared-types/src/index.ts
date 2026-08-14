/**
 * CauriPay — types partagés (packages/shared-types).
 *
 * Convention : enveloppes, enums et contrats HTTP internes communs à tous les
 * services TypeScript (api-core, kyc, aml, notification, ussd, business…).
 * Les montants sont TOUJOURS des entiers en unités mineures — jamais de float.
 */

// ---------------------------------------------------------------------------
// Enveloppes API
// ---------------------------------------------------------------------------

export interface ApiEnvelope<T> {
  success: true;
  data: T;
}

export interface ApiErrorEnvelope {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    /** Détails structurés (validation, champs…) — optionnel. */
    details?: unknown;
    /** Identifiant de requête pour corrélation dans les logs. */
    requestId?: string;
  };
}

export type ApiResponse<T> = ApiEnvelope<T> | ApiErrorEnvelope;

// ---------------------------------------------------------------------------
// Codes d'erreur (contrat HTTP interne)
// ---------------------------------------------------------------------------

export const ErrorCode = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  IDEMPOTENCY_CONFLICT: 'IDEMPOTENCY_CONFLICT',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION',
  RATE_LIMITED: 'RATE_LIMITED',
  KYC_LIMIT_EXCEEDED: 'KYC_LIMIT_EXCEEDED',
  WALLET_FROZEN: 'WALLET_FROZEN',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

// ---------------------------------------------------------------------------
// Enums de domaine (wallet)
// ---------------------------------------------------------------------------

export const TransactionStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  REVERSED: 'REVERSED',
} as const;
export type TransactionStatus = (typeof TransactionStatus)[keyof typeof TransactionStatus];

export const TransactionType = {
  TRANSFER: 'TRANSFER',
  CASH_IN: 'CASH_IN',
  CASH_OUT: 'CASH_OUT',
  REVERSAL: 'REVERSAL',
  FEE: 'FEE',
} as const;
export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];

export const KycLevel = {
  NONE: 'NONE',
  LEVEL_1: 'LEVEL_1',
  LEVEL_2: 'LEVEL_2',
  LEVEL_3: 'LEVEL_3',
} as const;
export type KycLevel = (typeof KycLevel)[keyof typeof KycLevel];

export const KycStatus = {
  PENDING: 'PENDING',
  VALIDATED: 'VALIDATED',
  REJECTED: 'REJECTED',
} as const;
export type KycStatus = (typeof KycStatus)[keyof typeof KycStatus];

export const WalletStatus = {
  ACTIVE: 'ACTIVE',
  FROZEN: 'FROZEN',
  CLOSED: 'CLOSED',
} as const;
export type WalletStatus = (typeof WalletStatus)[keyof typeof WalletStatus];

// ---------------------------------------------------------------------------
// Montants & devises
// ---------------------------------------------------------------------------

/** Montant en unités mineures (entier). JAMAIS de float. */
export type AmountMinor = number;

export const CurrencyCode = {
  XOF: 'XOF',
  XAF: 'XAF',
  GNF: 'GNF',
  CDF: 'CDF',
  NGN: 'NGN',
  GHS: 'GHS',
  EUR: 'EUR',
  USD: 'USD',
} as const;
export type CurrencyCode = (typeof CurrencyCode)[keyof typeof CurrencyCode];

/** Décimales ISO 4217 par devise (XOF/XAF/GNF = 0, le reste = 2). */
export const CURRENCY_DECIMALS: Readonly<Record<CurrencyCode, number>> = {
  XOF: 0,
  XAF: 0,
  GNF: 0,
  CDF: 2,
  NGN: 2,
  GHS: 2,
  EUR: 2,
  USD: 2,
};

export interface Money {
  amountMinor: AmountMinor;
  currency: CurrencyCode;
}

// ---------------------------------------------------------------------------
// Préfixes d'identifiants (lisibilité des IDs publics)
// ---------------------------------------------------------------------------

export const IdPrefix = {
  user: 'usr_',
  wallet: 'wlt_',
  transaction: 'tx_',
  kycRecord: 'kycr_',
  account: 'acct_',
  event: 'evt_',
} as const;

// ---------------------------------------------------------------------------
// Contrats HTTP internes — ledger-service (consommés par api-core)
// ---------------------------------------------------------------------------

export type LedgerDirection = 'DEBIT' | 'CREDIT';

export interface LedgerEntryDto {
  id: string;
  accountId: string;
  direction: LedgerDirection;
  amountMinor: AmountMinor;
  currency: CurrencyCode;
  type: TransactionType;
  reference: string;
  createdAt: string; // ISO-8601
}

export interface LedgerTransferRequest {
  /** Clé d'idempotence (24h) — obligatoire pour toute opération mutante. */
  idempotencyKey: string;
  fromAccountId: string;
  toAccountId: string;
  amountMinor: AmountMinor;
  currency: CurrencyCode;
  reference: string;
  metadata?: Record<string, string>;
}

export interface LedgerTransferResponse {
  transactionId: string;
  status: 'COMPLETED' | 'REJECTED';
  entries: LedgerEntryDto[];
}

export interface LedgerBalanceResponse {
  accountId: string;
  currency: CurrencyCode;
  balanceMinor: AmountMinor;
  /** Version optimiste (@Version) — à renvoyer pour toute mise à jour. */
  version: number;
}
