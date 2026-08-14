package com.cauripay.ledger.infrastructure.persistence;

import com.cauripay.ledger.domain.LedgerBalance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * Accès aux soldes — les mutations passent par LedgerWriteService
 * (verrou optimiste {@code @Version}).
 */
public interface LedgerBalanceJpaRepository extends JpaRepository<LedgerBalance, UUID> {
}
