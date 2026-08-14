package com.goursi.ledger.domain.exception;

/** GOURSI-014a · 409 — la même clé d'idempotence est réutilisée avec une commande différente. */
public class IdempotencyConflictException extends RuntimeException {
    public IdempotencyConflictException(String idempotencyKey) {
        super("Conflit d'idempotence : la clé " + idempotencyKey + " a déjà été utilisée avec un payload différent.");
    }
}
