package com.cauripay.ledger.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Solde d'un wallet — verrou optimiste {@code @Version} (GOURSI-012b).
 *
 * <p>Les mutations passent exclusivement par ledger-service (règle absolue n°1)
 * et par des méthodes package-private : le domaine ne peut pas être corrompu
 * depuis l'extérieur du package.
 */
@Entity
@Table(name = "ledger_balances", schema = "ledger")
public class LedgerBalance {

    @Id
    @Column(name = "wallet_id", nullable = false)
    private UUID walletId;

    @Column(name = "balance", nullable = false, precision = 15, scale = 2)
    private BigDecimal balance;

    @Column(name = "frozen_balance", nullable = false, precision = 15, scale = 2)
    private BigDecimal frozenBalance;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    @Column(name = "last_updated_at", nullable = false)
    private Instant lastUpdatedAt;

    protected LedgerBalance() {
    }

    private LedgerBalance(
        UUID walletId,
        BigDecimal balance,
        BigDecimal frozenBalance,
        long version,
        Instant lastUpdatedAt) {
        this.walletId = walletId;
        this.balance = balance;
        this.frozenBalance = frozenBalance;
        this.version = version;
        this.lastUpdatedAt = lastUpdatedAt;
    }

    public LedgerBalance(UUID walletId) {
        this(walletId, BigDecimal.ZERO.setScale(2), BigDecimal.ZERO.setScale(2), 0L, Instant.now());
    }

    /** Débite le solde (principal ou frais) — invariant : jamais négatif. */
    void debit(BigDecimal amount) {
        this.balance = balance.subtract(amount);
        touch();
    }

    /** Crédite le solde. */
    void credit(BigDecimal amount) {
        this.balance = balance.add(amount);
        touch();
    }

    void touch() {
        this.lastUpdatedAt = Instant.now();
    }

    public UUID walletId() {
        return walletId;
    }

    public BigDecimal balance() {
        return balance;
    }

    public BigDecimal frozenBalance() {
        return frozenBalance;
    }

    public long version() {
        return version;
    }

    public Instant lastUpdatedAt() {
        return lastUpdatedAt;
    }
}
