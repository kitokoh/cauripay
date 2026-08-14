package com.goursi.ledger.application;

import com.goursi.ledger.domain.exception.WalletNotFoundException;
import com.goursi.ledger.domain.model.LedgerBalance;
import com.goursi.ledger.domain.model.LedgerEntry;
import com.goursi.ledger.domain.result.BalanceResult;
import com.goursi.ledger.domain.result.LedgerEntryResponse;
import com.goursi.ledger.infrastructure.persistence.LedgerBalanceRepository;
import com.goursi.ledger.infrastructure.persistence.LedgerEntryRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Lecture seule — jamais dans une transaction d'écriture (GOURSI-016a). */
@Service
@Transactional(readOnly = true)
public class LedgerReadService {

  private final LedgerBalanceRepository balanceRepository;
  private final LedgerEntryRepository entryRepository;

  public LedgerReadService(
      LedgerBalanceRepository balanceRepository,
      LedgerEntryRepository entryRepository) {
    this.balanceRepository = balanceRepository;
    this.entryRepository = entryRepository;
  }

  /** Solde courant d'un wallet (404 si inconnu). */
  public BalanceResult getBalance(UUID walletId) {
    LedgerBalance b = balanceRepository.findById(walletId)
        .orElseThrow(() -> new WalletNotFoundException(walletId));
    return new BalanceResult(b.getWalletId(), b.getBalance(), b.getFrozenBalance(),
        b.getAvailableBalance(), b.getVersion());
  }

  /** Historique paginé (le plus récent d'abord). */
  public List<LedgerEntryResponse> history(UUID walletId, Pageable pageable) {
    return entryRepository.findByWalletIdOrderByCreatedAtDesc(walletId, pageable)
        .stream()
        .map(LedgerReadService::toResponse)
        .toList();
  }

  /** Entrées d'une transaction (reversal, vérifications). */
  public List<LedgerEntryResponse> byTransaction(UUID transactionId) {
    return entryRepository.findByTransactionId(transactionId).stream()
        .map(LedgerReadService::toResponse)
        .toList();
  }

  private static LedgerEntryResponse toResponse(LedgerEntry e) {
    return new LedgerEntryResponse(
        e.getId(), e.getTransactionId(), e.getWalletId(), e.getDirection().name(),
        e.getAmount(), e.getBalanceBefore(), e.getBalanceAfter(), e.getEntryType().name(),
        e.getDescription(), e.getCreatedAt());
  }
}
