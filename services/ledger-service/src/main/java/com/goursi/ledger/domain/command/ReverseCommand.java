package com.goursi.ledger.domain.command;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/** GOURSI-014d — annulation d'une transaction : écritures miroir REVERSAL. */
public record ReverseCommand(
        @NotNull UUID idempotencyKey,
        @NotNull UUID originalTransactionId,
        @NotBlank String reason
) {}
