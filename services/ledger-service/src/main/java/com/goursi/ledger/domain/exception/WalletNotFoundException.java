package com.goursi.ledger.domain.exception;

/** GOURSI-010c · 404 — wallet inconnu. */
public class WalletNotFoundException extends RuntimeException {
    private final String walletId;

    public WalletNotFoundException(String walletId) {
        super("Wallet introuvable : " + walletId);
        this.walletId = walletId;
    }

    public String getWalletId() {
        return walletId;
    }
}
