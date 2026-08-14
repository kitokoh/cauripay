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

    /**
     * Verrou pessimiste d'écriture : utilisé dans la transaction SERIALIZABLE du
     * write service (ceinture + bretelles, la vraie garantie étant @Version).
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from LedgerBalance b where b.walletId = :id")
    Optional<LedgerBalance> findByWalletIdForUpdate(@Param("id") UUID walletId);
}
