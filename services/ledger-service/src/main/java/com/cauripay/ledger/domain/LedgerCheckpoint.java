package com.cauripay.ledger.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Snapshot nightly des soldes (GOURSI-012c) — écrit par
 * {@code CheckpointScheduler} pour l'audit COBAC.
 */
@Entity
@Table(name = "ledger_checkpoints", schema = "ledger")
public class LedgerCheckpoint {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "snapshot_date", nullable = false)
    private LocalDate snapshotDate;

    @Column(name = "wallet_id", nullable = false)
    private UUID walletId;

    @Column(name = "balance", nullable = false, precision = 15, scale = 2)
    private BigDecimal balance;

    @Column(name = "frozen_balance", nullable = false, precision = 15, scale = 2)
    private BigDecimal frozenBalance;

    @Column(name = "version", nullable = false)
    private long version;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected LedgerCheckpoint() {
    }

    public LedgerCheckpoint(UUID id, LocalDate snapshotDate, UUID walletId,
                            BigDecimal balance, BigDecimal frozenBalance, long version) {
        this.id = id;
        this.snapshotDate = snapshotDate;
        this.walletId = walletId;
        this.balance = balance;
        this.frozenBalance = frozenBalance;
        this.version = version;
        this.createdAt = Instant.now();
    }

    public UUID id() {
        return id;
    }

    public LocalDate snapshotDate() {
        return snapshotDate;
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

    public Instant createdAt() {
        return createdAt;
    }
}
