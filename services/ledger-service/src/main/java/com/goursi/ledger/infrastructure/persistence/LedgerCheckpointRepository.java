package com.goursi.ledger.infrastructure.persistence;

import com.goursi.ledger.domain.model.LedgerCheckpoint;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LedgerCheckpointRepository extends JpaRepository<LedgerCheckpoint, UUID> {

  @Query("select c from LedgerCheckpoint c where c.walletId = :walletId order by c.createdAt desc limit 1")
  Optional<LedgerCheckpoint> findLatestByWalletId(@Param("walletId") UUID walletId);
}
