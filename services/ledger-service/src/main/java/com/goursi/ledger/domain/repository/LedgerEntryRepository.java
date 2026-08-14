package com.goursi.ledger.domain.repository;

import com.goursi.ledger.domain.model.LedgerEntry;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LedgerEntryRepository extends JpaRepository<LedgerEntry, UUID> {

    List<LedgerEntry> findByTransactionId(UUID transactionId);

    List<LedgerEntry> findByWalletIdOrderByCreatedAtDesc(UUID walletId, Pageable pageable);

    List<LedgerEntry> findByWalletIdAndCreatedAtBeforeOrderByCreatedAtDesc(
            UUID walletId, java.time.OffsetDateTime cursor, Pageable pageable);

    long countByWalletId(UUID walletId);
}
