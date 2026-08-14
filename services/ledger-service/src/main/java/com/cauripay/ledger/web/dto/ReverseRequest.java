package com.cauripay.ledger.web.dto;

import jakarta.validation.constraints.NotBlank;

/** Requête HTTP de reversal (GOURSI-014d). */
public record ReverseRequest(
    @NotBlank String idempotencyKey,
    @NotBlank String originalTransactionId,
    String reason) {
}
