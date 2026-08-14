package com.cauripay.ledger.application;

import com.cauripay.ledger.domain.LedgerCheckpoint;
import com.cauripay.ledger.infrastructure.persistence.LedgerBalanceJpaRepository;
import com.cauripay.ledger.infrastructure.persistence.LedgerCheckpointJpaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Snapshot nightly des soldes (GOURSI-016b) — cron 2h du matin
 * ({@code LEDGER_CHECKPOINT_CRON}, défaut {@code 0 0 2 * * *}).
 *
 * <p>Chaque nuit, l'état complet des balances est figé dans
 * {@code ledger_checkpoints} pour l'audit COBAC. Le snapshot du jour est
 * remplacé (idempotent si le job tourne deux fois).
 */
@Service
public class CheckpointScheduler {

    private static final Logger LOG = LoggerFactory.getLogger(CheckpointScheduler.class);

    private final LedgerBalanceJpaRepository balanceRepository;
    private final LedgerCheckpointJpaRepository checkpointRepository;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    public CheckpointScheduler(
        LedgerBalanceJpaRepository balanceRepository,
        LedgerCheckpointJpaRepository checkpointRepository,
        org.springframework.jdbc.core.JdbcTemplate jdbcTemplate) {
        this.balanceRepository = balanceRepository;
        this.checkpointRepository = checkpointRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Scheduled(cron = "${ledger.checkpoint.cron:0 0 2 * * *}")
    @Transactional
    public void snapshotNightly() {
        final LocalDate today = LocalDate.now();
        final long start = System.currentTimeMillis();
        // Suppression en SQL natif : exécutée immédiatement (les suppressions
        // JPA seraient flushées APRÈS les insertions du même cycle).
        jdbcTemplate.update("DELETE FROM ledger.ledger_checkpoints WHERE snapshot_date = ?", today);
        balanceRepository.findAll().forEach(balance ->
            checkpointRepository.save(new LedgerCheckpoint(
                UUID.randomUUID(), today, balance.walletId(),
                balance.balance(), balance.frozenBalance(), balance.version())));
        LOG.info("Checkpoint ledger du {} terminé ({} wallets) en {} ms",
            today, balanceRepository.count(), System.currentTimeMillis() - start);
    }

    /** Snapshot immédiat (diagnostic / ops) — appelable par l'actuator ou un test. */
    @Transactional
    public void snapshotNow() {
        snapshotNightly();
    }
}
