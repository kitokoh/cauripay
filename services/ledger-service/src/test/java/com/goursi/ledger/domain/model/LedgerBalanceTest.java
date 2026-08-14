package com.goursi.ledger.domain.model;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.goursi.ledger.domain.exception.InsufficientFundsException;
import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class LedgerBalanceTest {

  private final UUID walletId = UUID.randomUUID();

  @Test
  void credit_incremente_le_solde() {
    LedgerBalance balance = new LedgerBalance(walletId, new BigDecimal("100"));
    balance.credit(new BigDecimal("50.005"));

    // 150.005 arrondi HALF_UP à l'échelle 2 → 150.01
    assertThat(balance.getBalance()).isEqualByComparingTo("150.01");
    assertThat(balance.getVersion()).isZero();
  }

  @Test
  void credit_montant_non_positif_refuse() {
    LedgerBalance balance = new LedgerBalance(walletId);
    assertThatThrownBy(() -> balance.credit(BigDecimal.ZERO)).isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> balance.credit(new BigDecimal("-1"))).isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void debit_solde_suffisant() {
    LedgerBalance balance = new LedgerBalance(walletId, new BigDecimal("1000"));
    BigDecimal before = balance.debit(new BigDecimal("250.50"));

    assertThat(before).isEqualByComparingTo("1000.00");
    assertThat(balance.getBalance()).isEqualByComparingTo("749.50");
  }

  @Test
  void debit_insuffisant_leve_InsufficientFundsException() {
    LedgerBalance balance = new LedgerBalance(walletId, new BigDecimal("100"));

    assertThatThrownBy(() -> balance.debit(new BigDecimal("100.01")))
        .isInstanceOf(InsufficientFundsException.class)
        .hasMessageContaining("Solde insuffisant");

    // solde intact
    assertThat(balance.getBalance()).isEqualByComparingTo("100.00");
  }

  @Test
  void availableBalance_exclut_le_frozen() {
    LedgerBalance balance = new LedgerBalance(walletId, new BigDecimal("500"));
    balance.freeze(new BigDecimal("200"));

    assertThat(balance.getAvailableBalance()).isEqualByComparingTo("300.00");
    assertThat(balance.getFrozenBalance()).isEqualByComparingTo("200.00");
  }

  @Test
  void debit_au_dela_du_disponible_apres_gel_refuse() {
    LedgerBalance balance = new LedgerBalance(walletId, new BigDecimal("500"));
    balance.freeze(new BigDecimal("200"));

    assertThatThrownBy(() -> balance.debit(new BigDecimal("301")))
        .isInstanceOf(InsufficientFundsException.class);
  }

  @Test
  void freeze_puis_unfreeze() {
    LedgerBalance balance = new LedgerBalance(walletId, new BigDecimal("500"));
    balance.freeze(new BigDecimal("150"));
    balance.unfreeze(new BigDecimal("50"));

    assertThat(balance.getFrozenBalance()).isEqualByComparingTo("100.00");
    assertThat(balance.getAvailableBalance()).isEqualByComparingTo("400.00");
  }
}
