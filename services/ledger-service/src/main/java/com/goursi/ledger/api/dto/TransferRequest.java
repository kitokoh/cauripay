package com.goursi.ledger.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

/** GOURSI-015a · DTO d'entrée du transfert (jamais de montant en double/float). */
public record TransferRequest(
        @NotNull UUID idempotencyKey,
        @NotNull UUID transactionId,
        @NotNull UUID fromWalletId,
        @NotNull UUID toWalletId,
        @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
        @NotNull @DecimalMin(value = "0.00") BigDecimal feeAmount,
        @NotNull UUID platformFeesWalletId,
        String description
) {}
