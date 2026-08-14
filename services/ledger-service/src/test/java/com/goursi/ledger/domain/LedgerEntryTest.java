package com.goursi.ledger.domain;

import com.goursi.ledger.domain.model.LedgerEntry;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** GOURSI-012a — factory : balanceAfter calculé, échelle forcée à 2. */
class LedgerEntryTest {

    @Test
    void debit_balanceAfter_est_before_moins_amount() {
        LedgerEntry e = LedgerEntry.create(UUID.randomUUID(), UUID.randomUUID(), LedgerEntry.Direction.DEBIT,
            new BigDecimal("1000.00"), new BigDecimal("5000.00"), LedgerEntry.EntryType.PRINCIPAL, "Envoi");
        assertThat(e.getBalanceAfter()).isEqualByComparingTo("4000.00");
        assertThat(e.getBalanceBefore()).isEqualByComparingTo("5000.00");
    }

    @Test
    void credit_balanceAfter_est_before_plus_amount() {
        LedgerEntry e = LedgerEntry.create(UUID.randomUUID(), UUID.randomUUID(), LedgerEntry.Direction.CREDIT,
            new BigDecimal("250.5"), new BigDecimal("10.1"), LedgerEntry.EntryType.PRINCIPAL, "Réception");
        assertThat(e.getBalanceAfter()).isEqualByComparingTo("260.60");
    }

    @Test
    void echelle_forcee_a_2() {
        LedgerEntry e = LedgerEntry.create(UUID.randomUUID(), UUID.randomUUID(), LedgerEntry.Direction.CREDIT,
            new BigDecimal("1.999"), new BigDecimal("0"), LedgerEntry.EntryType.PRINCIPAL, null);
        assertThat(e.getAmount()).isEqualByComparingTo("2.00");
    }

    @Test
    void montant_non_positif_refuse() {
        assertThatThrownBy(() -> LedgerEntry.create(UUID.randomUUID(), UUID.randomUUID(), LedgerEntry.Direction.CREDIT,
            BigDecimal.ZERO, BigDecimal.ZERO, LedgerEntry.EntryType.PRINCIPAL, null))
            .isInstanceOf(IllegalArgumentException.class);
    }
}
