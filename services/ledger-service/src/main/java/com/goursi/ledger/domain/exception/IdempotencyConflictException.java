package com.goursi.ledger.domain.exception;

/** Clé d'idempotence déjà utilisée avec un payload différent → HTTP 409. */
public class IdempotencyConflictException extends RuntimeException {

  private final String idempotencyKey;

  public IdempotencyConflictException(String idempotencyKey) {
    super("IdempotencyKey déjà utilisée avec une commande différente : " + idempotencyKey);
    this.idempotencyKey = idempotencyKey;
  }

  public String getIdempotencyKey() {
    return idempotencyKey;
  }
}
