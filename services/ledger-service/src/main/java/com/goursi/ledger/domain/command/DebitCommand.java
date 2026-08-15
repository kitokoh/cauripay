package com.goursi.ledger.domain.command;

import com.goursi.ledger.domain.model.EntryType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

/** Débit unitaire (cash-out, correction). */
public record DebitCommand(
    @NotNull UUID idempotencyKey,
    @NotNull UUID transactionId,
    @NotNull UUID walletId,
    @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
    EntryType entryType,
    String description) {

  public DebitCommand {
    if (amount.scale() > 2) {
      throw new IllegalArgumentException("Montant max 2 décimales (FCFA) : " + amount);
    }
    entryType = entryType == null ? EntryType.PRINCIPAL : entryType;
  }
}
