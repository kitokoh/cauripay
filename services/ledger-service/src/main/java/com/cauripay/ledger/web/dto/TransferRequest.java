package com.cauripay.ledger.web.dto;

import com.cauripay.ledger.domain.EntryType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Requête HTTP de transfer (miroir de {@code TransferCommand} TS — UUID en string).
 */
public record TransferRequest(
    @NotBlank String idempotencyKey,
    @NotBlank String transactionId,
    @NotBlank String fromWalletId,
    @NotBlank String toWalletId,
    @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
    BigDecimal feeAmount,
    String platformFeesWalletId,
    String description,
    EntryType entryType) {
}
