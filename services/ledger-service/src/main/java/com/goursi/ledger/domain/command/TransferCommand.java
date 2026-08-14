package com.goursi.ledger.domain.command;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * GOURSI-013a — commande de transfert P2P. Immutable, validation dans le
 * compact constructor : aucune commande invalide ne peut exister.
 */
public record TransferCommand(
        @NotNull UUID idempotencyKey,
        @NotNull UUID transactionId,
        @NotNull UUID fromWalletId,
        @NotNull UUID toWalletId,
        @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
        @NotNull @DecimalMin(value = "0.00") BigDecimal feeAmount,
        @NotNull UUID platformFeesWalletId,
        String description
) {
    public TransferCommand {
        if (amount.scale() > 2 || feeAmount.scale() > 2) {
            throw new IllegalArgumentException("Montant max 2 décimales (FCFA)");
        }
        if (fromWalletId.equals(toWalletId)) {
            throw new IllegalArgumentException("fromWalletId et toWalletId doivent être différents");
        }
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Montant du transfert doit être positif");
        }
        if (feeAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Les frais ne peuvent pas être négatifs");
        }
    }

    /** Total débité sur le wallet émetteur : montant + frais. */
    public BigDecimal totalDebit() {
        return amount.add(feeAmount);
    }
}
