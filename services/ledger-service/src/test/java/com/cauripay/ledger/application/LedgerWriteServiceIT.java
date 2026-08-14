package com.cauripay.ledger.application;

import com.cauripay.ledger.AbstractLedgerIT;
import com.cauripay.ledger.application.command.CreditCommand;
import com.cauripay.ledger.application.command.DebitCommand;
import com.cauripay.ledger.application.command.ReverseCommand;
import com.cauripay.ledger.application.command.TransferCommand;
import com.cauripay.ledger.application.result.BalanceResult;
import com.cauripay.ledger.application.result.TransferResult;
import com.cauripay.ledger.common.InsufficientFundsException;
import com.cauripay.ledger.common.NotFoundException;
import com.cauripay.ledger.infrastructure.persistence.LedgerBalanceJpaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Tests d'intégration du chemin d'écriture (GOURSI-014b/c/d, GOURSI-014g) :
 * 4 écritures atomiques, soldes, 422 insuffisance, rejeu idempotent, reversal.
 */
class LedgerWriteServiceIT extends AbstractLedgerIT {

    @Autowired
    private LedgerWriteService writeService;

    @Autowired
    private LedgerReadService readService;

    @Autowired
    private LedgerBalanceJpaRepository balanceRepository;

    private UUID from;
    private UUID to;
    private UUID fees;

    @BeforeEach
    void seedBalances() {
        from = UUID.randomUUID();
        to = UUID.randomUUID();
        fees = UUID.randomUUID();
        // `from` est provisionné par un crédit comptable ; `to` et `fees`
        // sont auto-provisionnés au premier contact (transfer).
        fund(from, "1000.00");
    }

    @Test
    void transferAtomicCreatesExactlyFourEntries() {
        final UUID transactionId = UUID.randomUUID();

        final TransferResult result = writeService.transfer(new TransferCommand(
            "it-xfer-4-" + UUID.randomUUID(), transactionId, from, to,
            new BigDecimal("100.00"), new BigDecimal("1.90"), fees, "P2P", null));

        assertThat(result.success()).isTrue();
        assertThat(result.ledgerEntryIds()).hasSize(4);

        final BalanceResult fromBalance = readService.balance(from);
        final BalanceResult toBalance = readService.balance(to);
        final BalanceResult feesBalance = readService.balance(fees);

        assertThat(fromBalance.balance()).isEqualByComparingTo("898.10");
        assertThat(toBalance.balance()).isEqualByComparingTo("100.00");
        assertThat(feesBalance.balance()).isEqualByComparingTo("1.90");
    }

    @Test
    void replayReturnsSameResultWithoutDoubleDebit() {
        final UUID transactionId = UUID.randomUUID();
        final TransferCommand command = new TransferCommand(
            "it-xfer-replay-" + UUID.randomUUID(), transactionId, from, to,
            new BigDecimal("50.00"), null, null, "P2P", null);

        final TransferResult first = writeService.transfer(command);
        final TransferResult second = writeService.transfer(command);

        assertThat(second.transactionId()).isEqualTo(first.transactionId());
        assertThat(second.ledgerEntryIds()).isEqualTo(first.ledgerEntryIds());
        assertThat(readService.balance(from).balance()).isEqualByComparingTo("950.00");
    }

    @Test
    void insufficientFundsThrows422() {
        final TransferCommand command = new TransferCommand(
            "it-xfer-insuf-" + UUID.randomUUID(), UUID.randomUUID(), from, to,
            new BigDecimal("5000.00"), null, null, "P2P", null);

        assertThatThrownBy(() -> writeService.transfer(command))
            .isInstanceOf(InsufficientFundsException.class);
        // aucun changement de solde
        assertThat(readService.balance(from).balance()).isEqualByComparingTo("1000.00");
    }

    @Test
    void unknownWalletThrows404() {
        final TransferCommand command = new TransferCommand(
            "it-xfer-404-" + UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), to,
            new BigDecimal("10.00"), null, null, "P2P", null);

        assertThatThrownBy(() -> writeService.transfer(command))
            .isInstanceOf(NotFoundException.class);
    }

    @Test
    void creditAndDebitUpdateBalances() {
        // Chaque opération = sa propre transaction (l'équilibre est par transaction)
        writeService.credit(new CreditCommand("it-credit-" + UUID.randomUUID(),
            UUID.randomUUID(), to, new BigDecimal("25.00"), "cash-in"));
        assertThat(readService.balance(to).balance()).isEqualByComparingTo("25.00");

        writeService.debit(new DebitCommand("it-debit-" + UUID.randomUUID(),
            UUID.randomUUID(), from, new BigDecimal("10.00"), "cash-out"));
        assertThat(readService.balance(from).balance()).isEqualByComparingTo("990.00");

        assertThatThrownBy(() -> writeService.debit(new DebitCommand("it-debit2-" + UUID.randomUUID(),
            UUID.randomUUID(), to, new BigDecimal("99999.00"), null)))
            .isInstanceOf(InsufficientFundsException.class);
    }

    @Test
    void reverseRestoresBalances() {
        final UUID transactionId = UUID.randomUUID();
        final TransferResult transfer = writeService.transfer(new TransferCommand(
            "it-rev-1-" + UUID.randomUUID(), transactionId, from, to,
            new BigDecimal("100.00"), new BigDecimal("1.90"), fees, "P2P", null));
        assertThat(readService.balance(from).balance()).isEqualByComparingTo("898.10");

        final TransferResult reversal = writeService.reverse(new ReverseCommand(
            "it-rev-2-" + UUID.randomUUID(), transactionId, "Erreur de saisie"));

        assertThat(reversal.success()).isTrue();
        assertThat(reversal.ledgerEntryIds()).hasSize(4);
        assertThat(readService.balance(from).balance()).isEqualByComparingTo("1000.00");
        assertThat(readService.balance(to).balance()).isEqualByComparingTo("0.00");
        assertThat(readService.balance(fees).balance()).isEqualByComparingTo("0.00");

        // l'historique du wallet `from` : 1 crédit de provisionnement + 2 écritures
        // originales (débit principal + frais) + 2 miroirs REVERSAL (crédits)
        final List<?> history = readService.history(from, 100, null);
        assertThat(history).hasSize(5);
    }
}
