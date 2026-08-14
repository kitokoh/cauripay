package com.goursi.ledger.domain.repository;

import com.goursi.ledger.domain.model.LedgerBalance;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface LedgerBalanceRepository extends JpaRepository<LedgerBalance, UUID> {

    /** Verrou pessimiste d'écriture — complément de l'isolation SERIALIZABLE. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from LedgerBalance b where b.walletId = :walletId")
    Optional<LedgerBalance> findByWalletIdForUpdate(@Param("walletId") UUID walletId);
}
