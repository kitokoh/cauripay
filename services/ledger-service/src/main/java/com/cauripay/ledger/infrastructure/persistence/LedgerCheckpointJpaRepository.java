package com.cauripay.ledger.infrastructure.persistence;

import com.cauripay.ledger.domain.LedgerCheckpoint;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

/**
 * Accès aux snapshots nightly (GOURSI-012c).
 */
public interface LedgerCheckpointJpaRepository extends JpaRepository<LedgerCheckpoint, UUID> {

    Optional<LedgerCheckpoint> findBySnapshotDateAndWalletId(LocalDate date, UUID walletId);

    void deleteBySnapshotDate(LocalDate date);
}
