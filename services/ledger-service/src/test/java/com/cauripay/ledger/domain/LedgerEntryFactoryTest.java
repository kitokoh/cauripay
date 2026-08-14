package com.cauripay.ledger.domain;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests de la fabrique d'écritures : le transfer atomique produit exactement
 * 4 écritures équilibrées (DoD #1) avec des balance_before/after cohérentes.
 */
class LedgerEntryFactoryTest {

    private final UUID transactionId = UUID.randomUUID();

    private LedgerBalance balance(UUID id, String amount) {
        final LedgerBalance balance = new LedgerBalance(id);
        balance.credit(new BigDecimal(amount));
        return balance;
    }

    @Test
    void transferWithFeesCreatesExactlyFourEntries() {
        final LedgerBalance from = balance(UUID.randomUUID(), "1000.00");
        final LedgerBalance to = balance(UUID.randomUUID(), "500.00");
        final LedgerBalance fees = balance(UUID.randomUUID(), "0.00");

        final List<LedgerEntry> entries = LedgerEntryFactory.transferEntries(
            transactionId, from, to, fees,
            new BigDecimal("100.00"), new BigDecimal("1.90"), "P2P");

        assertThat(entries).hasSize(4);

        // Débit principal (émetteur)
        assertThat(entries.get(0).direction()).isEqualTo(LedgerDirection.DEBIT);
        assertThat(entries.get(0).entryType()).isEqualTo(EntryType.PRINCIPAL);
        assertThat(entries.get(0).balanceBefore()).isEqualByComparingTo("1000.00");
        assertThat(entries.get(0).balanceAfter()).isEqualByComparingTo("900.00");

        // Crédit principal (bénéficiaire)
        assertThat(entries.get(1).direction()).isEqualTo(LedgerDirection.CREDIT);
        assertThat(entries.get(1).balanceAfter()).isEqualByComparingTo("600.00");

        // Débit frais (émetteur)
        assertThat(entries.get(2).direction()).isEqualTo(LedgerDirection.DEBIT);
        assertThat(entries.get(2).entryType()).isEqualTo(EntryType.FEE);
        assertThat(entries.get(2).amount()).isEqualByComparingTo("1.90");
        assertThat(entries.get(2).balanceAfter()).isEqualByComparingTo("898.10");

        // Crédit frais collectés (wallet plateforme)
        assertThat(entries.get(3).direction()).isEqualTo(LedgerDirection.CREDIT);
        assertThat(entries.get(3).entryType()).isEqualTo(EntryType.FEE);
        assertThat(entries.get(3).walletId()).isEqualTo(fees.walletId());
        assertThat(entries.get(3).balanceAfter()).isEqualByComparingTo("1.90");

        // Soldes mutés de façon cohérente
        assertThat(from.balance()).isEqualByComparingTo("898.10");
        assertThat(to.balance()).isEqualByComparingTo("600.00");
        assertThat(fees.balance()).isEqualByComparingTo("1.90");
    }

    @Test
    void transferWithoutFeesCreatesTwoEntries() {
        final LedgerBalance from = balance(UUID.randomUUID(), "1000.00");
        final LedgerBalance to = balance(UUID.randomUUID(), "500.00");

        final List<LedgerEntry> entries = LedgerEntryFactory.transferEntries(
            transactionId, from, to, null,
            new BigDecimal("50.00"), BigDecimal.ZERO.setScale(2), "P2P");

        assertThat(entries).hasSize(2);
        assertThat(entries).allMatch(e -> e.transactionId().equals(transactionId));
    }

    @Test
    void reversalMirrorsDirectionsAndRestoresBalances() {
        final UUID fromId = UUID.randomUUID();
        final UUID toId = UUID.randomUUID();
        final UUID feesId = UUID.randomUUID();
        final LedgerBalance from = balance(fromId, "1000.00");
        final LedgerBalance to = balance(toId, "500.00");
        final LedgerBalance fees = balance(feesId, "0.00");

        final List<LedgerEntry> original = LedgerEntryFactory.transferEntries(
            transactionId, from, to, fees,
            new BigDecimal("100.00"), new BigDecimal("1.90"), "P2P");
        assertThat(from.balance()).isEqualByComparingTo("898.10"); // post-transfer

        final List<LedgerEntry> reversals = LedgerEntryFactory.reversalEntries(
            UUID.randomUUID(), original,
            id -> id.equals(fromId) ? from : id.equals(toId) ? to : fees);

        assertThat(reversals).hasSize(4);
        assertThat(reversals).allMatch(e -> e.entryType() == EntryType.REVERSAL);

        // Ordre d'application : du dernier au premier (LIFO) — le premier miroir
        // est celui du crédit de frais (wallet plateforme) → débit 1,90.
        assertThat(reversals.get(0).walletId()).isEqualTo(fees.walletId());
        assertThat(reversals.get(0).direction()).isEqualTo(LedgerDirection.DEBIT);
        assertThat(reversals.get(0).amount()).isEqualByComparingTo("1.90");

        // Chaque écriture est le miroir exact de l'originale (direction inversée)
        for (int i = 0; i < original.size(); i++) {
            final LedgerEntry originalEntry = original.get(original.size() - 1 - i);
            final LedgerEntry reversal = reversals.get(i);
            assertThat(reversal.walletId()).isEqualTo(originalEntry.walletId());
            assertThat(reversal.amount()).isEqualByComparingTo(originalEntry.amount());
            assertThat(reversal.direction()).isEqualTo(
                originalEntry.direction() == LedgerDirection.DEBIT
                    ? LedgerDirection.CREDIT
                    : LedgerDirection.DEBIT);
        }

        // Soldes restaurés à l'état initial
        assertThat(from.balance()).isEqualByComparingTo("1000.00");
        assertThat(to.balance()).isEqualByComparingTo("500.00");
        assertThat(fees.balance()).isEqualByComparingTo("0.00");
    }
}
