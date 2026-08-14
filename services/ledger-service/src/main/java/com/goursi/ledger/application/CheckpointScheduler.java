package com.goursi.ledger.application;

import com.goursi.ledger.domain.model.LedgerCheckpoint;
import com.goursi.ledger.infrastructure.persistence.LedgerBalanceRepository;
import com.goursi.ledger.infrastructure.persistence.LedgerCheckpointRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Snapshot nightly des soldes (GOURSI-016b) — cron configurable
 * (défaut « 0 0 2 * * * »). Alimente le contrôle d'intégrité COBAC.
 */
@Service
public class CheckpointScheduler {

  private static final Logger log = LoggerFactory.getLogger(CheckpointScheduler.class);

  private final LedgerBalanceRepository balanceRepository;
  private final LedgerCheckpointRepository checkpointRepository;
  private final com.goursi.ledger.infrastructure.persistence.LedgerEntryRepository entryRepository;

  public CheckpointScheduler(
      LedgerBalanceRepository balanceRepository,
      LedgerCheckpointRepository checkpointRepository,
      com.goursi.ledger.infrastructure.persistence.LedgerEntryRepository entryRepository) {
    this.balanceRepository = balanceRepository;
    this.checkpointRepository = checkpointRepository;
    this.entryRepository = entryRepository;
  }

  @Scheduled(cron = "${goursi.ledger.checkpoint-cron:0 0 2 * * *}")
  @Transactional
  public void snapshotAll() {
    List<UUID> walletIds = balanceRepository.findAll().stream()
        .map(b -> b.getWalletId())
        .toList();
    int saved = 0;
    for (UUID walletId : walletIds) {
      BigDecimal balance = balanceRepository.findById(walletId)
          .map(b -> b.getBalance())
          .orElse(BigDecimal.ZERO);
      long entriesCount = entryRepository.countByWallet(walletId);
      checkpointRepository.save(new LedgerCheckpoint(walletId, balance, entriesCount));
      saved++;
    }
    log.info("Checkpoint nightly : {} wallets snapshotés", saved);
  }
}
