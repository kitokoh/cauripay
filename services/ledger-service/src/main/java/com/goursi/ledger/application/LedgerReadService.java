package com.goursi.ledger.application;

import com.goursi.ledger.domain.exception.WalletNotFoundException;
import com.goursi.ledger.domain.model.LedgerBalance;
import com.goursi.ledger.domain.model.LedgerEntry;
import com.goursi.ledger.domain.repository.LedgerBalanceRepository;
import com.goursi.ledger.domain.repository.LedgerEntryRepository;
import com.goursi.ledger.domain.result.BalanceResult;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * GOURSI-016a — lecture seule : api-core ne lit JAMAIS les soldes ailleurs que
 * via ce service (HTTP). Aucune écriture ici.
 */
@Service
@Transactional(readOnly = true)
public class LedgerReadService {

    private final LedgerBalanceRepository balanceRepository;
    private final LedgerEntryRepository entryRepository;

    public LedgerReadService(LedgerBalanceRepository balanceRepository, LedgerEntryRepository entryRepository) {
        this.balanceRepository = balanceRepository;
        this.entryRepository = entryRepository;
    }

    public BalanceResult getBalance(UUID walletId) {
        LedgerBalance b = balanceRepository.findById(walletId)
            .orElseThrow(() -> new WalletNotFoundException(walletId.toString()));
        return new BalanceResult(b.getWalletId(), b.getBalance(), b.getFrozenBalance(),
            b.getAvailableBalance(), b.getVersion());
    }

    /** Historique paginé par curseur (created_at DESC, stable sous flux). */
    public List<LedgerEntry> getHistory(UUID walletId, Instant before, int limit) {
        int capped = Math.min(Math.max(limit, 1), 100);
        if (before == null) {
            return entryRepository.findByWalletIdOrderByCreatedAtDesc(walletId, PageRequest.of(0, capped));
        }
        return entryRepository.findByWalletIdAndCreatedAtBeforeOrderByCreatedAtDesc(walletId, before, PageRequest.of(0, capped));
    }
}
