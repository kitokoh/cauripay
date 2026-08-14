package com.goursi.ledger.domain.model;

import com.goursi.ledger.domain.exception.InsufficientFundsException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.UUID;

/**
 * GOURSI-012b — solde d'un wallet. @Version = verrou optimiste : deux écritures
 * simultanées sur le même wallet → OptimisticLockException (retentable).
 */
@Entity
@Table(name = "ledger_balances", schema = "ledger")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LedgerBalance {

    @Id
    @Column(name = "wallet_id")
    private UUID walletId;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal balance = BigDecimal.ZERO.setScale(2);

    @Column(name = "frozen_balance", nullable = false, precision = 15, scale = 2)
    private BigDecimal frozenBalance = BigDecimal.ZERO.setScale(2);

    @Version
    @Column(nullable = false)
    private Long version;

    @UpdateTimestamp
    @Column(name = "last_updated_at", nullable = false)
    private Instant lastUpdatedAt;

    public LedgerBalance(UUID walletId) {
        this.walletId = walletId;
    }

    /** Solde réellement mobilisable (hors gel). */
    public BigDecimal getAvailableBalance() {
        return balance.subtract(frozenBalance);
    }

    /** Crédite le wallet. Montant <= 0 → IllegalArgumentException. */
    public void credit(BigDecimal amount) {
        BigDecimal a = amount.setScale(2, RoundingMode.HALF_UP);
        if (a.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Montant de crédit doit être strictement positif");
        }
        this.balance = balance.add(a);
    }

    /** Débite le wallet. Découvert interdit → InsufficientFundsException. */
    public void debit(BigDecimal amount) {
        BigDecimal a = amount.setScale(2, RoundingMode.HALF_UP);
        if (a.compareTo(getAvailableBalance()) > 0) {
            throw new InsufficientFundsException(walletId.toString(), getAvailableBalance(), a);
        }
        this.balance = balance.subtract(a);
    }
}
