package com.goursi.ledger.application;

import com.goursi.ledger.domain.model.LedgerBalance;
import com.goursi.ledger.domain.model.LedgerCheckpoint;
import com.goursi.ledger.domain.repository.LedgerBalanceRepository;
import com.goursi.ledger.domain.repository.LedgerCheckpointRepository;
import com.goursi.ledger.domain.repository.LedgerEntryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.time.LocalDate;
import java.time.ZoneOffset;

/**
 * GOURSI-016b — snapshot nightly (cron 2h) des soldes par wallet dans
 * ledger_checkpoints. Idempotent : 1 checkpoint par wallet et par jour
 * (unicité V4).
 */
@Component
public class CheckpointScheduler {

    private static final Logger log = LoggerFactory.getLogger(CheckpointScheduler.class);

    private final LedgerBalanceRepository balanceRepository;
    private final LedgerEntryRepository entryRepository;
    private final LedgerCheckpointRepository checkpointRepository;

    public CheckpointScheduler(LedgerBalanceRepository balanceRepository,
                               LedgerEntryRepository entryRepository,
                               LedgerCheckpointRepository checkpointRepository) {
        this.balanceRepository = balanceRepository;
        this.entryRepository = entryRepository;
        this.checkpointRepository = checkpointRepository;
    }

    @Scheduled(cron = "${goursi.ledger.checkpoint-cron}")
    @Transactional
    public void snapshotWallets() {
        long start = System.currentTimeMillis();
        List<LedgerBalance> wallets = balanceRepository.findAll();
        int created = 0;
        int skipped = 0;
        for (LedgerBalance wallet : wallets) {
            try {
                long entriesCount = entryRepository.countByWalletId(wallet.getWalletId());
                checkpointRepository.save(new LedgerCheckpoint(wallet.getWalletId(), LocalDate.now(ZoneOffset.UTC),
                    wallet.getBalance(), entriesCount));
                created++;
            } catch (DataIntegrityViolationException e) {
                skipped++; // checkpoint du jour déjà existant (unicité V4)
            }
        }
        log.info("Checkpoints : {} créés, {} ignorés (déjà présents) en {} ms",
            created, skipped, System.currentTimeMillis() - start);
    }
}
