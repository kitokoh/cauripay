package com.cauripay.ledger.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Écriture comptable — entité immuable (GOURSI-012a).
 *
 * <p>Une écriture n'est jamais modifiée ni supprimée : les triggers PostgreSQL
 * (V5) refusent UPDATE/DELETE, et {@code @Immutable} le garantit côté Hibernate.
 * La création passe exclusivement par {@link LedgerEntryFactory}.
 */
@Entity
@Immutable
@Table(name = "ledger_entries", schema = "ledger")
public class LedgerEntry {

    @Id
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "transaction_id", updatable = false, nullable = false)
    private UUID transactionId;

    @Column(name = "wallet_id", updatable = false, nullable = false)
    private UUID walletId;

    @Enumerated(EnumType.STRING)
    @Column(name = "direction", updatable = false, nullable = false, length = 16)
    private LedgerDirection direction;

    @Column(name = "amount", updatable = false, nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(name = "balance_before", updatable = false, nullable = false, precision = 15, scale = 2)
    private BigDecimal balanceBefore;

    @Column(name = "balance_after", updatable = false, nullable = false, precision = 15, scale = 2)
    private BigDecimal balanceAfter;

    @Enumerated(EnumType.STRING)
    @Column(name = "entry_type", updatable = false, nullable = false, length = 32)
    private EntryType entryType;

    @Column(name = "description", updatable = false, length = 255)
    private String description;

    @Column(name = "created_at", updatable = false, nullable = false)
    private Instant createdAt;

    /** Requis par JPA — jamais utilisé (entité immuable). */
    protected LedgerEntry() {
    }

    LedgerEntry(
        UUID id,
        UUID transactionId,
        UUID walletId,
        LedgerDirection direction,
        BigDecimal amount,
        BigDecimal balanceBefore,
        BigDecimal balanceAfter,
        EntryType entryType,
        String description,
        Instant createdAt) {
        this.id = id;
        this.transactionId = transactionId;
        this.walletId = walletId;
        this.direction = direction;
        this.amount = amount;
        this.balanceBefore = balanceBefore;
        this.balanceAfter = balanceAfter;
        this.entryType = entryType;
        this.description = description;
        this.createdAt = createdAt;
    }

    public UUID id() {
        return id;
    }

    public UUID transactionId() {
        return transactionId;
    }

    public UUID walletId() {
        return walletId;
    }

    public LedgerDirection direction() {
        return direction;
    }

    public BigDecimal amount() {
        return amount;
    }

    public BigDecimal balanceBefore() {
        return balanceBefore;
    }

    public BigDecimal balanceAfter() {
        return balanceAfter;
    }

    public EntryType entryType() {
        return entryType;
    }

    public String description() {
        return description;
    }

    public Instant createdAt() {
        return createdAt;
    }
}
