"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LedgerTransactionStatus = exports.EntryType = exports.LedgerDirection = exports.WalletStatus = exports.WalletType = exports.KycStatus = exports.KycLevel = exports.TransactionType = exports.TransactionStatus = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["CUSTOMER"] = "CUSTOMER";
    UserRole["MERCHANT"] = "MERCHANT";
    UserRole["AGENT"] = "AGENT";
    UserRole["DISTRIBUTOR"] = "DISTRIBUTOR";
    UserRole["SUPER_ADMIN"] = "SUPER_ADMIN";
    UserRole["COMPLIANCE_OFFICER"] = "COMPLIANCE_OFFICER";
    UserRole["SUPPORT_L1"] = "SUPPORT_L1";
    UserRole["SUPPORT_L2"] = "SUPPORT_L2";
    UserRole["FINANCE_MANAGER"] = "FINANCE_MANAGER";
    UserRole["OPS_AGENT_MANAGER"] = "OPS_AGENT_MANAGER";
})(UserRole || (exports.UserRole = UserRole = {}));
var TransactionStatus;
(function (TransactionStatus) {
    TransactionStatus["PENDING"] = "PENDING";
    TransactionStatus["PROCESSING"] = "PROCESSING";
    TransactionStatus["SUCCESS"] = "SUCCESS";
    TransactionStatus["FAILED"] = "FAILED";
    TransactionStatus["CANCELLED"] = "CANCELLED";
    TransactionStatus["REVERSED"] = "REVERSED";
})(TransactionStatus || (exports.TransactionStatus = TransactionStatus = {}));
var TransactionType;
(function (TransactionType) {
    TransactionType["P2P"] = "P2P";
    TransactionType["CASH_IN"] = "CASH_IN";
    TransactionType["CASH_OUT"] = "CASH_OUT";
    TransactionType["BILL_PAYMENT"] = "BILL_PAYMENT";
    TransactionType["MERCHANT_PAYMENT"] = "MERCHANT_PAYMENT";
})(TransactionType || (exports.TransactionType = TransactionType = {}));
var KycLevel;
(function (KycLevel) {
    KycLevel["BASIC"] = "BASIC";
    KycLevel["VERIFIED"] = "VERIFIED";
    KycLevel["PREMIUM"] = "PREMIUM";
})(KycLevel || (exports.KycLevel = KycLevel = {}));
var KycStatus;
(function (KycStatus) {
    KycStatus["PENDING"] = "PENDING";
    KycStatus["APPROVED"] = "APPROVED";
    KycStatus["REJECTED"] = "REJECTED";
})(KycStatus || (exports.KycStatus = KycStatus = {}));
var WalletType;
(function (WalletType) {
    WalletType["CUSTOMER"] = "CUSTOMER";
    WalletType["AGENT"] = "AGENT";
    WalletType["AGENT_FLOAT"] = "AGENT_FLOAT";
    WalletType["MERCHANT"] = "MERCHANT";
    WalletType["PLATFORM_FEES"] = "PLATFORM_FEES";
    WalletType["PLATFORM_REVENUE"] = "PLATFORM_REVENUE";
})(WalletType || (exports.WalletType = WalletType = {}));
var WalletStatus;
(function (WalletStatus) {
    WalletStatus["ACTIVE"] = "ACTIVE";
    WalletStatus["FROZEN"] = "FROZEN";
    WalletStatus["CLOSED"] = "CLOSED";
})(WalletStatus || (exports.WalletStatus = WalletStatus = {}));
var LedgerDirection;
(function (LedgerDirection) {
    LedgerDirection["DEBIT"] = "DEBIT";
    LedgerDirection["CREDIT"] = "CREDIT";
})(LedgerDirection || (exports.LedgerDirection = LedgerDirection = {}));
var EntryType;
(function (EntryType) {
    EntryType["PRINCIPAL"] = "PRINCIPAL";
    EntryType["FEE"] = "FEE";
    EntryType["COMMISSION"] = "COMMISSION";
    EntryType["REVERSAL"] = "REVERSAL";
})(EntryType || (exports.EntryType = EntryType = {}));
var LedgerTransactionStatus;
(function (LedgerTransactionStatus) {
    LedgerTransactionStatus["COMPLETED"] = "COMPLETED";
    LedgerTransactionStatus["FAILED"] = "FAILED";
    LedgerTransactionStatus["REVERSED"] = "REVERSED";
})(LedgerTransactionStatus || (exports.LedgerTransactionStatus = LedgerTransactionStatus = {}));
//# sourceMappingURL=index.js.map