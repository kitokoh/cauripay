package com.cauripay.ledger.infrastructure.persistence;

import com.cauripay.ledger.domain.LedgerEntry;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Accès aux écritures — lecture seule (l'entité est immuable, GOURSI-012a).
 */
public interface LedgerEntryJpaRepository extends JpaRepository<LedgerEntry, UUID> {

    List<LedgerEntry> findByTransactionIdOrderByCreatedAtAsc(UUID transactionId);

    /** Historique paginé (keyset par created_at). */
    @Query("""
        SELECT e FROM LedgerEntry e
        WHERE e.walletId = :walletId AND e.createdAt < :before
        ORDER BY e.createdAt DESC
        """)
    List<LedgerEntry> findHistory(@Param("walletId") UUID walletId,
                                  @Param("before") Instant before,
                                  Pageable pageable);
}
