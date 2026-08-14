package com.goursi.ledger.api.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/** Requête de reversal. */
public record ReverseRequest(
        @NotNull UUID originalTransactionId,
        String reason,
        @NotNull UUID idempotencyKey
) {}
