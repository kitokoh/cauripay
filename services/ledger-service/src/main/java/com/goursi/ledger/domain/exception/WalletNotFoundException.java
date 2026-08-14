package com.goursi.ledger.domain.exception;

import java.util.UUID;

/** Wallet inconnu → HTTP 404. */
public class WalletNotFoundException extends RuntimeException {
    public WalletNotFoundException(UUID walletId) {
        super("Wallet inconnu: " + walletId);
    }
}
