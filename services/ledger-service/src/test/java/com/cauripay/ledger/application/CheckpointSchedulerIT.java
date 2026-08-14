package com.cauripay.ledger.application;

import com.cauripay.ledger.AbstractLedgerIT;
import com.cauripay.ledger.infrastructure.persistence.LedgerBalanceJpaRepository;
import com.cauripay.ledger.infrastructure.persistence.LedgerCheckpointJpaRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Snapshot nightly (GOURSI-016b) : un checkpoint par wallet, remplaçable
 * (idempotent si le cron tourne deux fois le même jour).
 */
class CheckpointSchedulerIT extends AbstractLedgerIT {

    @Autowired
    private CheckpointScheduler scheduler;

    @Autowired
    private LedgerBalanceJpaRepository balanceRepository;

    @Autowired
    private LedgerCheckpointJpaRepository checkpointRepository;

    @Test
    void snapshotCreatesOneCheckpointPerWallet() {
        fund(UUID.randomUUID(), "50.00");
        fund(UUID.randomUUID(), "25.00");

        final long expected = balanceRepository.count();

        scheduler.snapshotNow();
        assertThat(checkpointRepository.count()).isEqualTo(expected);

        // idempotent : un second run ne duplique pas
        scheduler.snapshotNow();
        assertThat(checkpointRepository.count()).isEqualTo(expected);
    }
}
