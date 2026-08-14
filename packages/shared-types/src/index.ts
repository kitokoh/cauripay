/**
 * @cauripay/shared-types — Types partagés du monorepo CauriPay.
 *
 * Règles :
 * - Montants : type `Decimal`/string (jamais `number` flottant).
 * - Zéro dépendance runtime.
 */

// ---------------------------------------------------------------------------
// Enveloppes de réponse API
// ---------------------------------------------------------------------------

/** Enveloppe de réponse standard de l'API publique. */
export interface ApiResponse<T = unknown> {
  success: true;
  data: T;
  timestamp: string; // ISO-8601
  requestId: string;
}

/** Enveloppe d'erreur structurée. */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string; // ex: "INSUFFICIENT_FUNDS"
    message: string; // lisible humain
    details?: Record<string, unknown>;
  };
  timestamp: string;
  requestId: string;
}

// ---------------------------------------------------------------------------
// Enums métier (spec §4.4)
// ---------------------------------------------------------------------------

export enum TransactionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REVERSED = 'REVERSED',
}

export enum TransactionType {
  P2P = 'P2P',
  CASH_IN = 'CASH_IN',
  CASH_OUT = 'CASH_OUT',
  BILL_PAYMENT = 'BILL_PAYMENT',
  MERCHANT_PAYMENT = 'MERCHANT_PAYMENT',
}

export enum KycLevel {
  BASIC = 'BASIC',
  VERIFIED = 'VERIFIED',
  PREMIUM = 'PREMIUM',
}

export enum WalletType {
  CUSTOMER = 'CUSTOMER',
  MERCHANT = 'MERCHANT',
  AGENT = 'AGENT',
  DISTRIBUTOR = 'DISTRIBUTOR',
}

export enum WalletStatus {
  ACTIVE = 'ACTIVE',
  FROZEN = 'FROZEN',
  CLOSED = 'CLOSED',
}

/** Rôles Keycloak (spec §4.4). */
export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  MERCHANT = 'MERCHANT',
  AGENT = 'AGENT',
  DISTRIBUTOR = 'DISTRIBUTOR',
  SUPER_ADMIN = 'SUPER_ADMIN',
  COMPLIANCE_OFFICER = 'COMPLIANCE_OFFICER',
  SUPPORT_L1 = 'SUPPORT_L1',
  SUPPORT_L2 = 'SUPPORT_L2',
  FINANCE_MANAGER = 'FINANCE_MANAGER',
  OPS_AGENT_MANAGER = 'OPS_AGENT_MANAGER',
}

// ---------------------------------------------------------------------------
// Enums ledger (miroir des enums Java)
// ---------------------------------------------------------------------------

export enum LedgerDirection {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

export enum EntryType {
  PRINCIPAL = 'PRINCIPAL',
  FEE = 'FEE',
  COMMISSION = 'COMMISSION',
  REVERSAL = 'REVERSAL',
}

// ---------------------------------------------------------------------------
// Contrats HTTP inter-services (miroir des DTO Java ledger)
// ---------------------------------------------------------------------------

/** Montant porteur d'une devise — toujours une chaîne décimale, jamais de float. */
export type Money = string;

export interface TransferPayload {
  idempotencyKey: string;
  fromWalletId: string;
  toWalletId: string;
  amount: Money;
  currency: string;
  type: TransactionType;
  reference: string;
  metadata?: Record<string, unknown>;
}

export interface TransferResult {
  transferId: string;
  idempotencyKey: string;
  status: 'COMPLETED' | 'REJECTED';
  entries: LedgerEntryDto[];
  createdAt: string;
}

export interface BalanceResult {
  walletId: string;
  currency: string;
  available: Money;
  ledger: Money;
  updatedAt: string;
}

export interface LedgerEntryDto {
  id: string;
  walletId: string;
  direction: LedgerDirection;
  entryType: EntryType;
  amount: Money;
  currency: string;
  reference: string;
  createdAt: string;
}
