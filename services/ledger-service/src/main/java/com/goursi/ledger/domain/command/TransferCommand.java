package com.goursi.ledger.domain.command;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

/**
 * Commande de transfert atomique (4 écritures : débit principal, crédit principal,
 * débit frais, crédit frais collectés). Record Java 21 — immuable par construction.
 */
public record TransferCommand(
    @NotNull UUID idempotencyKey,
    @NotNull UUID transactionId,
    @NotNull UUID fromWalletId,
    @NotNull UUID toWalletId,
    @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
    @DecimalMin(value = "0.00") BigDecimal feeAmount,
    UUID platformFeesWalletId,
    String description) {

  public TransferCommand {
    if (fromWalletId.equals(toWalletId)) {
      throw new IllegalArgumentException("fromWalletId et toWalletId doivent être différents");
    }
    if (amount.scale() > 2) {
      throw new IllegalArgumentException("Montant max 2 décimales (FCFA) : " + amount);
    }
    if (feeAmount != null && feeAmount.scale() > 2) {
      throw new IllegalArgumentException("Fee max 2 décimales (FCFA) : " + feeAmount);
    }
    if (feeAmount != null && platformFeesWalletId == null && feeAmount.signum() > 0) {
      throw new IllegalArgumentException("platformFeesWalletId requis si feeAmount > 0");
    }
  }

  public BigDecimal effectiveFee() {
    return feeAmount == null ? BigDecimal.ZERO : feeAmount;
  }

  public BigDecimal totalDebit() {
    return amount.add(effectiveFee());
  }
}
