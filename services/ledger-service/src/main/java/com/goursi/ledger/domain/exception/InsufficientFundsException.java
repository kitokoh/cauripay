package com.goursi.ledger.domain.exception;

import java.math.BigDecimal;
import java.util.UUID;

/** Solde insuffisant → HTTP 422. */
public class InsufficientFundsException extends RuntimeException {
    private final UUID walletId;
    private final BigDecimal available;
    private final BigDecimal requested;

    public InsufficientFundsException(UUID walletId, BigDecimal available, BigDecimal requested) {
        super("Solde insuffisant: disponible=" + available + ", demandé=" + requested
                + " (wallet " + walletId + ")");
        this.walletId = walletId;
        this.available = available;
        this.requested = requested;
    }

    public UUID getWalletId() { return walletId; }
    public BigDecimal getAvailable() { return available; }
    public BigDecimal getRequested() { return requested; }
}
