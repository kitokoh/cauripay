package com.goursi.ledger.domain.command;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class CommandValidationTest {

  private final UUID key = UUID.randomUUID();
  private final UUID txId = UUID.randomUUID();
  private final UUID from = UUID.randomUUID();
  private final UUID to = UUID.randomUUID();

  @Test
  void transfer_valide() {
    TransferCommand cmd = new TransferCommand(key, txId, from, to,
        new BigDecimal("10000"), new BigDecimal("100"), UUID.randomUUID(), null);
    assertThat(cmd.totalDebit()).isEqualByComparingTo("10100");
    assertThat(cmd.effectiveFee()).isEqualByComparingTo("100");
  }

  @Test
  void transfer_sans_frais() {
    TransferCommand cmd = new TransferCommand(key, txId, from, to,
        new BigDecimal("10000"), null, null, "Test");
    assertThat(cmd.effectiveFee()).isEqualByComparingTo("0");
    assertThat(cmd.totalDebit()).isEqualByComparingTo("10000");
  }

  @Test
  void from_egal_to_refuse() {
    assertThatThrownBy(() -> new TransferCommand(key, txId, from, from,
        new BigDecimal("100"), BigDecimal.ZERO, null, null))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void scale_superieure_a_2_refusee() {
    assertThatThrownBy(() -> new TransferCommand(key, txId, from, to,
        new BigDecimal("100.005"), BigDecimal.ZERO, null, null))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("2 décimales");

    assertThatThrownBy(() -> new TransferCommand(key, txId, from, to,
        new BigDecimal("100"), new BigDecimal("1.005"), null, null))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void frais_positifs_sans_wallet_plateforme_refuses() {
    assertThatThrownBy(() -> new TransferCommand(key, txId, from, to,
        new BigDecimal("100"), new BigDecimal("1"), null, null))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("platformFeesWalletId");
  }

  @Test
  void credit_et_debit_validation() {
    CreditCommand credit = new CreditCommand(key, txId, from, new BigDecimal("50"), null, null);
    DebitCommand debit = new DebitCommand(key, txId, to, new BigDecimal("50"), null, null);
    assertThat(credit.entryType()).isEqualTo(com.goursi.ledger.domain.model.EntryType.PRINCIPAL);
    assertThat(debit.entryType()).isEqualTo(com.goursi.ledger.domain.model.EntryType.PRINCIPAL);

    assertThatThrownBy(() -> new CreditCommand(key, txId, from, new BigDecimal("1.005"), null, null))
        .isInstanceOf(IllegalArgumentException.class);
  }
}
