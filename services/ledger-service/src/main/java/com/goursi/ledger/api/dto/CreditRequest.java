package com.goursi.ledger.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

/** Requête de crédit unitaire. */
public record CreditRequest(
    @NotNull UUID idempotencyKey,
    @NotNull UUID transactionId,
    @NotNull UUID walletId,
    @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
    String entryType,
    String description) {}
