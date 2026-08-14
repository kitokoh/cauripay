package com.goursi.ledger.api.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/** Requête de reversal (écritures miroir). */
public record ReverseRequest(
    @NotNull UUID originalTransactionId,
    @NotNull UUID idempotencyKey,
    String reason) {}
