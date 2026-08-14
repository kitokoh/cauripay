package com.goursi.ledger.domain.exception;

/** Clé d'idempotence déjà utilisée avec un payload différent → HTTP 409. */
public class IdempotencyConflictException extends RuntimeException {
    public IdempotencyConflictException(String idempotencyKey) {
        super("Clé d'idempotence déjà utilisée avec une commande différente: " + idempotencyKey);
    }
}
