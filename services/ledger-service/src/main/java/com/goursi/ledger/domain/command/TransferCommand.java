package com.goursi.ledger.domain.command;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Commande de transfert P2P — immuable, validation dans le compact constructor.
 * Aucune commande invalide ne peut exister.
 */
public record TransferCommand(
        @NotNull UUID idempotencyKey,
        @NotNull UUID transactionId,
        @NotNull UUID fromWalletId,
        @NotNull UUID toWalletId,
        @NotNull @DecimalMin(value = "0.01", message = "Montant doit être positif") BigDecimal amount,
        @NotNull @DecimalMin(value = "0.00", message = "Frais ne peut être négatif") BigDecimal feeAmount,
        @NotNull UUID platformFeesWalletId,
        String description
) {
    public TransferCommand {
        if (amount != null && amount.scale() > 2) {
            throw new IllegalArgumentException("Montant max 2 décimales (FCFA)");
        }
        if (feeAmount != null && feeAmount.scale() > 2) {
            throw new IllegalArgumentException("Frais max 2 décimales (FCFA)");
        }
        if (fromWalletId != null && fromWalletId.equals(toWalletId)) {
            throw new IllegalArgumentException("fromWalletId et toWalletId doivent différer");
        }
    }
}
