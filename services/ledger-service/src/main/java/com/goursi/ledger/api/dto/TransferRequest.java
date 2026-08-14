package com.goursi.ledger.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

/** Requête de transfert atomique (miroir de TransferCommand). */
public record TransferRequest(
    @NotNull UUID idempotencyKey,
    @NotNull UUID transactionId,
    @NotNull UUID fromWalletId,
    @NotNull UUID toWalletId,
    @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
    @DecimalMin(value = "0.00") BigDecimal feeAmount,
    UUID platformFeesWalletId,
    String description) {}
