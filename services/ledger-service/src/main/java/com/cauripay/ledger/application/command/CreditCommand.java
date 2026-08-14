package com.cauripay.ledger.application.command;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;
import java.util.UUID;

/**
 * Commande de crédit unitaire (miroir de {@code CreditCommand} TS).
 */
public record CreditCommand(
    @NotBlank String idempotencyKey,
    @NotNull UUID transactionId,
    @NotNull UUID walletId,
    @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
    String description) {

    public CreditCommand {
        Objects.requireNonNull(idempotencyKey, "idempotencyKey");
        Objects.requireNonNull(transactionId, "transactionId");
        Objects.requireNonNull(walletId, "walletId");
        Objects.requireNonNull(amount, "amount");
        amount = amount.setScale(2, RoundingMode.HALF_UP);
    }
}
