package com.goursi.ledger.application;

import com.goursi.ledger.domain.exception.WalletNotFoundException;
import com.goursi.ledger.domain.model.LedgerEntry;
import com.goursi.ledger.domain.repository.LedgerEntryRepository;
import com.goursi.ledger.domain.repository.LedgerBalanceRepository;
import com.goursi.ledger.domain.result.BalanceResult;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Lecture seule — api-core ne lit jamais wallets.balance en Prisma,
 * il interroge ledger-service (HTTP). Aucune écriture ici.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LedgerReadService {

    private static final int DEFAULT_PAGE_SIZE = 50;

    private final LedgerBalanceRepository balanceRepository;
    private final LedgerEntryRepository entryRepository;

    public BalanceResult getBalance(UUID walletId) {
        var balance = balanceRepository.findById(walletId)
                .orElseThrow(() -> new WalletNotFoundException(walletId));
        return BalanceResult.of(walletId, balance.getBalance(), balance.getFrozenBalance(),
                balance.getAvailableBalance(), balance.getVersion());
    }

    /** Historique paginé par curseur (created_at DESC) — index idx_le_wallet_date. */
    public List<LedgerEntry> getHistory(UUID walletId, OffsetDateTime cursor, int limit) {
        int size = limit > 0 ? Math.min(limit, 200) : DEFAULT_PAGE_SIZE;
        if (cursor == null) {
            return entryRepository.findByWalletIdOrderByCreatedAtDesc(walletId, PageRequest.of(0, size));
        }
        return entryRepository.findByWalletIdAndCreatedAtBeforeOrderByCreatedAtDesc(
                walletId, cursor, PageRequest.of(0, size));
    }
}
