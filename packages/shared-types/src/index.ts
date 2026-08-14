/**
 * @goursi/shared-types — types partagés par tous les services NestJS.
 * Règle : ZÉRO dépendance runtime. Montants en string (Decimal) — jamais number.
 */

// ── Enveloppes API ────────────────────────────────────────────────────────────

/** Enveloppe de réponse uniforme : { success, data, timestamp, requestId } */
export interface ApiEnvelope<T> {
  success: true;
  data: T;
  timestamp: string; // ISO-8601
  requestId: string;
}

/** Enveloppe d'erreur : { code, message, details } */
export interface ApiErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: string;
  requestId: string;
}

export type ApiResponse<T> = ApiEnvelope<T> | ApiErrorEnvelope;

// ── Enums métier (spec §4.4) ──────────────────────────────────────────────────

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

export enum TransactionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
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

export enum KycStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum WalletType {
  CUSTOMER = 'CUSTOMER',
  AGENT = 'AGENT',
  AGENT_FLOAT = 'AGENT_FLOAT',
  MERCHANT = 'MERCHANT',
  PLATFORM_FEES = 'PLATFORM_FEES',
  PLATFORM_REVENUE = 'PLATFORM_REVENUE',
}

export enum WalletStatus {
  ACTIVE = 'ACTIVE',
  FROZEN = 'FROZEN',
  CLOSED = 'CLOSED',
}

// ── Enums ledger ──────────────────────────────────────────────────────────────

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

export enum LedgerTransactionStatus {
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REVERSED = 'REVERSED',
}

// ── Contrats HTTP inter-services (miroir des DTO Java) ────────────────────────

export interface TransferCommand {
  idempotencyKey: string;
  transactionId: string;
  fromWalletId: string;
  toWalletId: string;
  amount: string; // Decimal, échelle 2
  feeAmount?: string;
  platformFeesWalletId?: string;
  description?: string;
  entryType?: EntryType;
}

export interface CreditCommand {
  idempotencyKey: string;
  transactionId: string;
  walletId: string;
  amount: string;
  description?: string;
}

export interface DebitCommand {
  idempotencyKey: string;
  transactionId: string;
  walletId: string;
  amount: string;
  description?: string;
}

export interface TransferResult {
  success: boolean;
  transactionId: string;
  ledgerEntryIds: string[];
  balances?: {
    from: string;
    to: string;
    platformFees?: string;
  };
  errorCode?: string;
  errorMessage?: string;
}

export interface BalanceResult {
  walletId: string;
  balance: string;
  frozenBalance: string;
  availableBalance: string;
  version: number;
}

export interface LedgerEntryView {
  id: string;
  transactionId: string;
  walletId: string;
  direction: LedgerDirection;
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  entryType: EntryType;
  description: string;
  createdAt: string;
}
