package com.goursi.ledger.domain;

import com.goursi.ledger.domain.command.CreditCommand;
import com.goursi.ledger.domain.command.DebitCommand;
import com.goursi.ledger.domain.command.TransferCommand;
import com.goursi.ledger.domain.model.LedgerEntry.EntryType;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** GOURSI-013a — aucune commande invalide ne peut exister. */
class CommandTest {

    private final UUID key = UUID.randomUUID();
    private final UUID tx = UUID.randomUUID();
    private final UUID from = UUID.randomUUID();
    private final UUID to = UUID.randomUUID();
    private final UUID feeWallet = UUID.randomUUID();

    @Test
    void transfer_valid_commande() {
        TransferCommand cmd = new TransferCommand(key, tx, from, to,
            new BigDecimal("10000.00"), new BigDecimal("100.00"), feeWallet, "Envoi P2P");
        assertThat(cmd.totalDebit()).isEqualByComparingTo("10100.00");
    }

    @Test
    void transfer_from_egal_to_refuse() {
        assertThatThrownBy(() -> new TransferCommand(key, tx, from, from,
            new BigDecimal("100.00"), BigDecimal.ZERO, feeWallet, null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("différents");
    }

    @Test
    void transfer_scale_superieur_2_refuse() {
        assertThatThrownBy(() -> new TransferCommand(key, tx, from, to,
            new BigDecimal("100.001"), BigDecimal.ZERO, feeWallet, null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("2 décimales");
    }

    @Test
    void transfer_montant_non_positif_refuse() {
        assertThatThrownBy(() -> new TransferCommand(key, tx, from, to,
            BigDecimal.ZERO, BigDecimal.ZERO, feeWallet, null))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void credit_debit_validations() {
        assertThatThrownBy(() -> new CreditCommand(key, from, new BigDecimal("5.555"), tx, EntryType.PRINCIPAL, null))
            .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new DebitCommand(key, from, BigDecimal.ZERO, tx, EntryType.PRINCIPAL, null))
            .isInstanceOf(IllegalArgumentException.class);
    }
}
