package com.goursi.ledger.application;

import com.goursi.ledger.domain.model.LedgerBalance;
import com.goursi.ledger.domain.model.LedgerCheckpoint;
import com.goursi.ledger.domain.repository.LedgerBalanceRepository;
import com.goursi.ledger.domain.repository.LedgerCheckpointRepository;
import com.goursi.ledger.domain.repository.LedgerEntryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;

/**
 * Snapshot nightly des soldes (cron « 0 0 2 * * * ») — support du contrôle COBAC.
 * Unicité (wallet, jour) garantie par V4.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CheckpointScheduler {

    private final LedgerBalanceRepository balanceRepository;
    private final LedgerCheckpointRepository checkpointRepository;
    private final LedgerEntryRepository entryRepository;

    @Scheduled(cron = "${goursi.ledger.checkpoint-cron:0 0 2 * * *}")
    @Transactional
    public void runNightlyCheckpoint() {
        Instant start = Instant.now();
        int count = 0;
        for (LedgerBalance balance : balanceRepository.findAll()) {
            long entries = entryRepository.countByWalletId(balance.getWalletId());
            try {
                checkpointRepository.save(
                        LedgerCheckpoint.of(balance.getWalletId(), balance.getBalance(), entries));
                count++;
            } catch (Exception e) {
                // Unicité (wallet, jour) : doublon attendu si le job tourne deux fois le même jour
                log.warn("Checkpoint déjà existant pour wallet {} (idempotence journalière)",
                        balance.getWalletId());
            }
        }
        log.info("Checkpoint nightly terminé : {} wallets snapshotés en {} ms",
                count, Duration.between(start, Instant.now()).toMillis());
    }
}
