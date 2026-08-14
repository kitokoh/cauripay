package com.goursi.ledger.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/** GOURSI-014d · demande d'annulation. */
public record ReverseRequest(
        @NotNull UUID idempotencyKey,
        @NotNull UUID originalTransactionId,
        @NotBlank String reason
) {}
