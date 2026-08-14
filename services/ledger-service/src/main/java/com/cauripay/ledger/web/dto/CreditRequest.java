package com.cauripay.ledger.web.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/** Requête HTTP de crédit unitaire. */
public record CreditRequest(
    @NotBlank String idempotencyKey,
    @NotBlank String transactionId,
    @NotBlank String walletId,
    @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
    String description) {
}
