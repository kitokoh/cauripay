package com.goursi.ledger.domain.model;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class LedgerEntryTest {

  private final UUID txId = UUID.randomUUID();
  private final UUID walletId = UUID.randomUUID();

  @Test
  void create_produit_une_entite_valide_avec_balanceAfter_exacte() {
    LedgerEntry entry = LedgerEntry.create(
        txId, walletId, LedgerDirection.CREDIT,
        new BigDecimal("100.004"), new BigDecimal("500"),
        EntryType.PRINCIPAL, "Réception P2P");

    assertThat(entry.getTransactionId()).isEqualTo(txId);
    assertThat(entry.getWalletId()).isEqualTo(walletId);
    assertThat(entry.getDirection()).isEqualTo(LedgerDirection.CREDIT);
    assertThat(entry.getBalanceBefore()).isEqualByComparingTo("500.00");
    // scale forcé à 2 (HALF_UP)
    assertThat(entry.getAmount()).isEqualByComparingTo("100.00");
    assertThat(entry.getBalanceAfter()).isEqualByComparingTo("600.00");
    assertThat(entry.getEntryType()).isEqualTo(EntryType.PRINCIPAL);
  }

  @Test
  void debit_calcule_balanceAfter_par_soustraction() {
    LedgerEntry entry = LedgerEntry.create(
        txId, walletId, LedgerDirection.DEBIT,
        new BigDecimal("250.50"), new BigDecimal("1000"),
        EntryType.PRINCIPAL, "Envoi P2P");

    assertThat(entry.getBalanceAfter()).isEqualByComparingTo("749.50");
  }

  @Test
  void montant_zero_ou_negatif_est_refuse() {
    assertThatThrownBy(() -> LedgerEntry.create(
        txId, walletId, LedgerDirection.DEBIT,
        BigDecimal.ZERO, BigDecimal.TEN, EntryType.PRINCIPAL, null))
        .isInstanceOf(IllegalArgumentException.class);

    assertThatThrownBy(() -> LedgerEntry.create(
        txId, walletId, LedgerDirection.DEBIT,
        new BigDecimal("-5"), BigDecimal.TEN, EntryType.PRINCIPAL, null))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void balanceBefore_null_refuse() {
    assertThatThrownBy(() -> LedgerEntry.create(
        txId, walletId, LedgerDirection.CREDIT,
        BigDecimal.ONE, null, EntryType.PRINCIPAL, null))
        .isInstanceOf(IllegalArgumentException.class);
  }
}
