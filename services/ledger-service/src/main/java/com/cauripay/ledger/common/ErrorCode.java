package com.cauripay.ledger.common;

/**
 * Codes d'erreur du contrat interne (miroir de {@code packages/shared-types}).
 */
public enum ErrorCode {

    /** Requête invalide (validation, format). */
    VALIDATION_FAILED,

    /** Clé de service absente ou invalide (X-Service-Key). */
    INVALID_SERVICE_KEY,

    /** Ressource introuvable (wallet, transaction…). */
    NOT_FOUND,

    /** Conflit (idempotence, état, verrou optimiste). */
    CONFLICT,

    /** Solde insuffisant. */
    INSUFFICIENT_FUNDS,

    /** Transition d'état invalide. */
    INVALID_STATE_TRANSITION,

    /** Erreur interne — détail jamais exposé au client. */
    INTERNAL_ERROR
}
