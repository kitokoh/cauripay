package com.goursi.ledger.domain.command;

import com.goursi.ledger.domain.model.LedgerEntry.EntryType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

/** GOURSI-013a — débit unitaire (cash-out, correction, frais). */
public record DebitCommand(
        @NotNull UUID idempotencyKey,
        @NotNull UUID walletId,
        @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
        @NotNull UUID transactionId,
        @NotNull EntryType entryType,
        String description
) {
    public DebitCommand {
        if (amount.scale() > 2) {
            throw new IllegalArgumentException("Montant max 2 décimales (FCFA)");
        }
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Montant du débit doit être positif");
        }
    }
}
