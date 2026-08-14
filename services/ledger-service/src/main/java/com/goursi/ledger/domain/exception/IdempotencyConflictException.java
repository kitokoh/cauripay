package com.goursi.ledger.domain.exception;

/**
 * Levée quand une clé d'idempotence est réutilisée avec une commande différente
 * (même clé, payload différent) — risque de double exécution.
 *
 * <p>Mappe sur HTTP 409 {@code IDEMPOTENCY_CONFLICT}.
 */
public class IdempotencyConflictException extends RuntimeException {

  private final String idempotencyKey;

  public IdempotencyConflictException(String idempotencyKey) {
    super("Clé d'idempotence déjà utilisée avec une commande différente : " + idempotencyKey);
    this.idempotencyKey = idempotencyKey;
  }

  public String getIdempotencyKey() {
    return idempotencyKey;
  }
}
