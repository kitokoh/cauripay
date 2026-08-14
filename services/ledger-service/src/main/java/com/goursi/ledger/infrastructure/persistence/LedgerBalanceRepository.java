package com.goursi.ledger.infrastructure.persistence;

import com.goursi.ledger.domain.model.LedgerBalance;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LedgerBalanceRepository extends JpaRepository<LedgerBalance, UUID> {

  /** Verrou pessimiste en complément de SERIALIZABLE (écriture). */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select b from LedgerBalance b where b.walletId = :walletId")
  Optional<LedgerBalance> findByWalletIdForUpdate(@Param("walletId") UUID walletId);
}
