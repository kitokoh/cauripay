package com.goursi.ledger.domain.exception;

/** Wallet inconnu → HTTP 404 (code WALLET_NOT_FOUND). */
public class WalletNotFoundException extends RuntimeException {

  private final Object walletId;

  public WalletNotFoundException(Object walletId) {
    super("Wallet inconnu : " + walletId);
    this.walletId = walletId;
  }

  public Object getWalletId() {
    return walletId;
  }
}
