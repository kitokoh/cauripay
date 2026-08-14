export interface ApiEnvelope<T> {
    success: true;
    data: T;
    timestamp: string;
    requestId: string;
}
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
export declare enum UserRole {
    CUSTOMER = "CUSTOMER",
    MERCHANT = "MERCHANT",
    AGENT = "AGENT",
    DISTRIBUTOR = "DISTRIBUTOR",
    SUPER_ADMIN = "SUPER_ADMIN",
    COMPLIANCE_OFFICER = "COMPLIANCE_OFFICER",
    SUPPORT_L1 = "SUPPORT_L1",
    SUPPORT_L2 = "SUPPORT_L2",
    FINANCE_MANAGER = "FINANCE_MANAGER",
    OPS_AGENT_MANAGER = "OPS_AGENT_MANAGER"
}
export declare enum TransactionStatus {
    PENDING = "PENDING",
    PROCESSING = "PROCESSING",
    SUCCESS = "SUCCESS",
    FAILED = "FAILED",
    CANCELLED = "CANCELLED",
    REVERSED = "REVERSED"
}
export declare enum TransactionType {
    P2P = "P2P",
    CASH_IN = "CASH_IN",
    CASH_OUT = "CASH_OUT",
    BILL_PAYMENT = "BILL_PAYMENT",
    MERCHANT_PAYMENT = "MERCHANT_PAYMENT"
}
export declare enum KycLevel {
    BASIC = "BASIC",
    VERIFIED = "VERIFIED",
    PREMIUM = "PREMIUM"
}
export declare enum KycStatus {
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED"
}
export declare enum WalletType {
    CUSTOMER = "CUSTOMER",
    AGENT = "AGENT",
    AGENT_FLOAT = "AGENT_FLOAT",
    MERCHANT = "MERCHANT",
    PLATFORM_FEES = "PLATFORM_FEES",
    PLATFORM_REVENUE = "PLATFORM_REVENUE"
}
export declare enum WalletStatus {
    ACTIVE = "ACTIVE",
    FROZEN = "FROZEN",
    CLOSED = "CLOSED"
}
export declare enum LedgerDirection {
    DEBIT = "DEBIT",
    CREDIT = "CREDIT"
}
export declare enum EntryType {
    PRINCIPAL = "PRINCIPAL",
    FEE = "FEE",
    COMMISSION = "COMMISSION",
    REVERSAL = "REVERSAL"
}
export declare enum LedgerTransactionStatus {
    COMPLETED = "COMPLETED",
    FAILED = "FAILED",
    REVERSED = "REVERSED"
}
export interface TransferCommand {
    idempotencyKey: string;
    transactionId: string;
    fromWalletId: string;
    toWalletId: string;
    amount: string;
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
