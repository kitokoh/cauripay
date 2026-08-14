package com.goursi.ledger.domain.repository;

import com.goursi.ledger.domain.model.LedgerEntry;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

/** GOURSI-016a · historique paginé par curseur sur (wallet_id, created_at DESC). */
public interface LedgerEntryRepository extends JpaRepository<LedgerEntry, UUID> {

    List<LedgerEntry> findByWalletIdOrderByCreatedAtDesc(UUID walletId, Pageable pageable);

    List<LedgerEntry> findByWalletIdAndCreatedAtBeforeOrderByCreatedAtDesc(UUID walletId, java.time.Instant before, Pageable pageable);

    List<LedgerEntry> findByTransactionId(UUID transactionId);

    long countByWalletId(UUID walletId);
}
