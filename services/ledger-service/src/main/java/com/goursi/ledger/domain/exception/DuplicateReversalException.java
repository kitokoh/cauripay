package com.goursi.ledger.domain.exception;

import java.util.UUID;

/** Tentative de reversal d'une transaction déjà reversée → HTTP 409. */
public class DuplicateReversalException extends RuntimeException {

  private final UUID transactionId;

  public DuplicateReversalException(UUID transactionId) {
    super("Transaction déjà reversée : " + transactionId);
    this.transactionId = transactionId;
  }

  public UUID getTransactionId() {
    return transactionId;
  }
}
