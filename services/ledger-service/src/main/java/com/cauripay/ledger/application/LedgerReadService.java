package com.cauripay.ledger.application;

import com.cauripay.ledger.application.result.BalanceResult;
import com.cauripay.ledger.application.result.LedgerEntryView;
import com.cauripay.ledger.common.NotFoundException;
import com.cauripay.ledger.domain.LedgerBalance;
import com.cauripay.ledger.domain.LedgerEntry;
import com.cauripay.ledger.infrastructure.persistence.LedgerBalanceJpaRepository;
import com.cauripay.ledger.infrastructure.persistence.LedgerEntryJpaRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Lecture des soldes et de l'historique (GOURSI-016a) — accès en lecture seule,
 * jamais de mutation ici.
 */
@Service
public class LedgerReadService {

    private static final int MAX_HISTORY_LIMIT = 100;

    private final LedgerBalanceJpaRepository balanceRepository;
    private final LedgerEntryJpaRepository entryRepository;

    public LedgerReadService(
        LedgerBalanceJpaRepository balanceRepository,
        LedgerEntryJpaRepository entryRepository) {
        this.balanceRepository = balanceRepository;
        this.entryRepository = entryRepository;
    }

    @Transactional(readOnly = true)
    public BalanceResult balance(UUID walletId) {
        final LedgerBalance balance = balanceRepository.findById(walletId)
            .orElseThrow(() -> NotFoundException.wallet(walletId));
        return new BalanceResult(
            balance.walletId(), balance.balance(), balance.frozenBalance(), balance.version());
    }

    @Transactional(readOnly = true)
    public List<LedgerEntryView> history(UUID walletId, int limit, Instant before) {
        final int safeLimit = Math.min(limit, MAX_HISTORY_LIMIT);
        final Instant cursor = before == null ? Instant.now() : before;
        return entryRepository.findHistory(walletId, cursor, PageRequest.of(0, safeLimit))
            .stream()
            .map(this::toView)
            .toList();
    }

    private LedgerEntryView toView(LedgerEntry e) {
        return new LedgerEntryView(
            e.id(),
            e.transactionId(),
            e.walletId(),
            e.direction(),
            e.amount(),
            e.balanceBefore(),
            e.balanceAfter(),
            e.entryType(),
            e.description(),
            e.createdAt());
    }
}
