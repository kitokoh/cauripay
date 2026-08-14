package com.cauripay.ledger.application.command;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.Objects;
import java.util.UUID;

/**
 * Commande de reversal (GOURSI-014d) : annule une transaction déjà passée
 * en créant des écritures miroir (REVERSAL).
 */
public record ReverseCommand(
    @NotBlank String idempotencyKey,
    @NotNull UUID originalTransactionId,
    String reason) {

    public ReverseCommand {
        Objects.requireNonNull(idempotencyKey, "idempotencyKey");
        Objects.requireNonNull(originalTransactionId, "originalTransactionId");
    }
}
