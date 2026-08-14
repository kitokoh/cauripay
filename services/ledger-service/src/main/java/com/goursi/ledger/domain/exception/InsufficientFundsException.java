package com.goursi.ledger.domain.exception;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Levée quand un débit dépasse le solde disponible (ou le solde tout court).
 *
 * <p>Mappe sur HTTP 422 {@code INSUFFICIENT_FUNDS} — jamais sur 500 :
 * c'est une réponse métier attendue, pas une erreur système.
 */
public class InsufficientFundsException extends RuntimeException {

  private final UUID walletId;
  private final BigDecimal balance;
  private final BigDecimal requested;

  public InsufficientFundsException(UUID walletId, BigDecimal balance, BigDecimal requested) {
    super("Solde insuffisant");
    this.walletId = walletId;
    this.balance = balance;
    this.requested = requested;
  }

  public UUID getWalletId() {
    return walletId;
  }

  public BigDecimal getBalance() {
    return balance;
  }

  public BigDecimal getRequested() {
    return requested;
  }
}
