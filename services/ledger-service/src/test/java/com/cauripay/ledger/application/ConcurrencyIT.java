package com.cauripay.ledger.application;

import com.cauripay.ledger.AbstractLedgerIT;
import com.cauripay.ledger.application.command.TransferCommand;
import com.cauripay.ledger.application.result.BalanceResult;
import com.cauripay.ledger.domain.LedgerBalance;
import com.cauripay.ledger.infrastructure.persistence.LedgerBalanceJpaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Test de concurrence (GOURSI-014f, DoD #2) : 10 threads transfèrent
 * simultanément depuis le même wallet → aucun solde corrompu.
 *
 * <p>Attendu : le solde final = 1000 - (10 × 100) - (10 × 1,90) = -… non —
 * chaque transfer consomme 101,90 → 10 × 101,90 = 1019 > 1000 : seuls les
 * transferts finançables passent, les autres échouent proprement (422).
 * Le solde final ne doit JAMAIS être négatif et doit être cohérent avec le
 * nombre de transferts réussis (équilibre vérifié par le rapport Verify).
 */
class ConcurrencyIT extends AbstractLedgerIT {

    private static final int THREADS = 10;

    @Autowired
    private LedgerWriteService writeService;

    @Autowired
    private LedgerVerifyService verifyService;

    @Autowired
    private LedgerBalanceJpaRepository balanceRepository;

    private UUID from;
    private UUID to;
    private UUID fees;

    @BeforeEach
    void seed() {
        from = UUID.randomUUID();
        to = UUID.randomUUID();
        fees = UUID.randomUUID();
        // `from` est provisionné par un crédit comptable ; `to` et `fees`
        // sont auto-provisionnés au premier contact (transfer).
        fund(from, "1000.00");
    }

    @Test
    void tenThreadsDoNotCorruptBalances() throws Exception {
        final ExecutorService executor = Executors.newFixedThreadPool(THREADS);
        try {
            final List<Callable<Boolean>> tasks = new ArrayList<>();
            for (int i = 0; i < THREADS; i++) {
                final int index = i;
                tasks.add(() -> {
                    try {
                        writeService.transfer(new TransferCommand(
                            "concurrency-" + UUID.randomUUID() + "-" + index, UUID.randomUUID(), from, to,
                            new BigDecimal("100.00"), new BigDecimal("1.90"), fees, "P2P", null));
                        return true;
                    } catch (com.cauripay.ledger.common.InsufficientFundsException e) {
                        return false; // échec propre : plus assez de solde
                    }
                });
            }

            final List<Future<Boolean>> futures = executor.invokeAll(tasks);
            int succeeded = 0;
            int failed = 0;
            for (final Future<Boolean> future : futures) {
                if (Boolean.TRUE.equals(future.get())) {
                    succeeded++;
                } else {
                    failed++;
                }
            }

            final BalanceResult fromBalance = readBalance();
            final BalanceResult toBalance = readBalance(to);

            // Le débit max théorique : floor(1000 / 101,90) = 9 → au plus 9 succès
            assertThat(succeeded).isLessThanOrEqualTo(9);
            assertThat(failed).isEqualTo(THREADS - succeeded);

            // Solde jamais négatif + cohérent avec le nombre de succès
            assertThat(fromBalance.balance()).isGreaterThanOrEqualTo(BigDecimal.ZERO);
            assertThat(toBalance.balance())
                .isEqualByComparingTo(new BigDecimal(succeeded * 100).setScale(2));

            // Équilibre comptable global : 0 écart (DoD #4)
            assertThat(verifyService.verify().ok()).isTrue();
        } finally {
            executor.shutdownNow();
        }
    }

    private BalanceResult readBalance() {
        return readBalance(from);
    }

    private BalanceResult readBalance(UUID walletId) {
        // lecture via repository (le service de lecture est aussi testé ailleurs)
        final LedgerBalance balance = balanceRepository.findById(walletId).orElseThrow();
        return new BalanceResult(balance.walletId(), balance.balance(),
            balance.frozenBalance(), balance.version());
    }
}
