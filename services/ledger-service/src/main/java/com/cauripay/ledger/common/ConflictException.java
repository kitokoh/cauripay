package com.cauripay.ledger.common;

/** 409 — conflit (idempotence, état, verrou optimiste). */
public class ConflictException extends BusinessException {

    public ConflictException(String message) {
        super(ErrorCode.CONFLICT, 409, message);
    }

    /** Conflit d'idempotence : même clé, commande différente. */
    public static ConflictException idempotency(String idempotencyKey) {
        return new ConflictException(
            "Conflit d'idempotence pour la clé " + idempotencyKey + " : commande différente.");
    }
}
