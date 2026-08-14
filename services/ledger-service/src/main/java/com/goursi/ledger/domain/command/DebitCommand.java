package com.goursi.ledger.domain.command;

import com.goursi.ledger.domain.model.EntryType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

/** Commande de débit unitaire (cash-out, correction). */
public record DebitCommand(
        @NotNull UUID idempotencyKey,
        @NotNull UUID walletId,
        @NotNull @DecimalMin(value = "0.01", message = "Montant doit être positif") BigDecimal amount,
        @NotNull UUID transactionId,
        @NotNull EntryType entryType
) {
    public DebitCommand {
        if (amount != null && amount.scale() > 2) {
            throw new IllegalArgumentException("Montant max 2 décimales (FCFA)");
        }
    }
}
