package com.cauripay.ledger.application.command;

import com.cauripay.ledger.domain.EntryType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;
import java.util.UUID;

/**
 * Commande de transfer atomique (miroir de {@code TransferCommand} TS).
 *
 * <p>Invariants : montants en {@link BigDecimal} (jamais de float), échelle 2,
 * émetteur ≠ bénéficiaire, frais ≥ 0.
 */
public record TransferCommand(
    @NotBlank String idempotencyKey,
    @NotNull UUID transactionId,
    @NotNull UUID fromWalletId,
    @NotNull UUID toWalletId,
    @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
    BigDecimal feeAmount,
    UUID platformFeesWalletId,
    String description,
    EntryType entryType) {

    public TransferCommand {
        Objects.requireNonNull(idempotencyKey, "idempotencyKey");
        Objects.requireNonNull(transactionId, "transactionId");
        Objects.requireNonNull(fromWalletId, "fromWalletId");
        Objects.requireNonNull(toWalletId, "toWalletId");
        Objects.requireNonNull(amount, "amount");
        if (fromWalletId.equals(toWalletId)) {
            throw new IllegalArgumentException("fromWalletId et toWalletId doivent être différents.");
        }
        if (feeAmount != null && feeAmount.signum() < 0) {
            throw new IllegalArgumentException("feeAmount ne peut pas être négatif.");
        }
        amount = normalize(amount);
        feeAmount = feeAmount == null ? null : normalize(feeAmount);
    }

    /** Frais effectifs (0 si absent). */
    public BigDecimal effectiveFee() {
        return feeAmount == null ? BigDecimal.ZERO.setScale(2) : feeAmount;
    }

    private static BigDecimal normalize(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }
}
