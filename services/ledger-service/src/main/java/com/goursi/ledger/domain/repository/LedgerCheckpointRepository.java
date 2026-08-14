package com.goursi.ledger.domain.repository;

import com.goursi.ledger.domain.model.LedgerCheckpoint;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface LedgerCheckpointRepository extends JpaRepository<LedgerCheckpoint, UUID> {

    Optional<LedgerCheckpoint> findFirstByWalletIdOrderByCreatedAtDesc(UUID walletId);
}
