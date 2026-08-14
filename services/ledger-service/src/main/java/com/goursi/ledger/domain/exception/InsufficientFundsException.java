package com.goursi.ledger.domain.exception;

import java.math.BigDecimal;

/** GOURSI-010c · 422 — solde insuffisant (découvert interdit). */
public class InsufficientFundsException extends RuntimeException {
    private final String walletId;
    private final BigDecimal balance;
    private final BigDecimal requested;

    public InsufficientFundsException(String walletId, BigDecimal balance, BigDecimal requested) {
        super("Solde insuffisant : wallet " + walletId + " (disponible " + balance + ", requis " + requested + ")");
        this.walletId = walletId;
        this.balance = balance;
        this.requested = requested;
    }

    public String getWalletId() { return walletId; }
    public BigDecimal getBalance() { return balance; }
    public BigDecimal getRequested() { return requested; }
}
