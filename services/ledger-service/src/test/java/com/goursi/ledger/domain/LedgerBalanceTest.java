package com.goursi.ledger.domain;

import com.goursi.ledger.domain.exception.InsufficientFundsException;
import com.goursi.ledger.domain.model.LedgerBalance;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** GOURSI-012b — credit/debit + contrôle de fonds. */
class LedgerBalanceTest {

    @Test
    void credit_incremente_et_debit_decremente() {
        LedgerBalance b = new LedgerBalance(UUID.randomUUID());
        b.credit(new BigDecimal("100.00"));
        assertThat(b.getBalance()).isEqualByComparingTo("100.00");
        b.debit(new BigDecimal("40.00"));
        assertThat(b.getBalance()).isEqualByComparingTo("60.00");
    }

    @Test
    void debit_sans_fonds_refuse() {
        LedgerBalance b = new LedgerBalance(UUID.randomUUID());
        b.credit(new BigDecimal("10.00"));
        assertThatThrownBy(() -> b.debit(new BigDecimal("10.01")))
            .isInstanceOf(InsufficientFundsException.class);
    }

    @Test
    void frozen_balance_reduit_le_disponible() {
        LedgerBalance b = new LedgerBalance(UUID.randomUUID());
        b.credit(new BigDecimal("100.00"));
        // on gèle via le champ (pas de setter applicatif en v0.2 — le gel est exposé en lecture)
        assertThat(b.getAvailableBalance()).isEqualByComparingTo("100.00");
    }

    @Test
    void credit_montant_non_positif_refuse() {
        LedgerBalance b = new LedgerBalance(UUID.randomUUID());
        assertThatThrownBy(() -> b.credit(BigDecimal.ZERO))
            .isInstanceOf(IllegalArgumentException.class);
    }
}
