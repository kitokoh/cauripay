package com.goursi.ledger.domain.model;

import com.goursi.ledger.domain.exception.InsufficientFundsException;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Solde d'un wallet. @Version = verrou optimiste anti-corruption sous concurrence.
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
    private Long version = 0L;

    @UpdateTimestamp
    @Column(name = "last_updated_at", nullable = false)
    private OffsetDateTime lastUpdatedAt;

    public static LedgerBalance open(UUID walletId) {
        LedgerBalance b = new LedgerBalance();
        b.walletId = walletId;
        return b;
    }

    public BigDecimal getAvailableBalance() {
        return balance.subtract(frozenBalance);
    }

    /** Crédite le solde. Montant <= 0 → IllegalArgumentException. */
    public void credit(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Montant du crédit doit être strictement positif");
        }
        this.balance = this.balance.add(amount).setScale(2, java.math.RoundingMode.HALF_UP);
    }

    /** Débite le solde si disponible. Sinon InsufficientFundsException. */
    public void debit(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Montant du débit doit être strictement positif");
        }
        if (getAvailableBalance().compareTo(amount) < 0) {
            throw new InsufficientFundsException(walletId, getAvailableBalance(), amount);
        }
        this.balance = this.balance.subtract(amount).setScale(2, java.math.RoundingMode.HALF_UP);
    }
}
