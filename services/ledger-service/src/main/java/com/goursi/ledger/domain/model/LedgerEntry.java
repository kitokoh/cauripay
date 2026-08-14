package com.goursi.ledger.domain.model;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Immutable;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Écriture comptable du journal — immuable en JPA (@Immutable) ET en base (triggers V5).
 * Aucun updatedAt/deletedAt : une écriture ne se modifie jamais.
 */
@Entity
@Table(name = "ledger_entries", schema = "ledger")
@Immutable
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LedgerEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false)
    private UUID id;

    @Column(name = "transaction_id", nullable = false, updatable = false)
    private UUID transactionId;

    @Column(name = "wallet_id", nullable = false, updatable = false)
    private UUID walletId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private LedgerDirection direction;

    @Column(nullable = false, precision = 15, scale = 2, updatable = false)
    private BigDecimal amount;

    @Column(name = "balance_before", nullable = false, precision = 15, scale = 2, updatable = false)
    private BigDecimal balanceBefore;

    @Column(name = "balance_after", nullable = false, precision = 15, scale = 2, updatable = false)
    private BigDecimal balanceAfter;

    @Enumerated(EnumType.STRING)
    @Column(name = "entry_type", nullable = false, updatable = false)
    private EntryType entryType;

    @Column(nullable = false, updatable = false)
    private String description;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    private LedgerEntry(UUID transactionId, UUID walletId, LedgerDirection direction,
                        BigDecimal amount, BigDecimal balanceBefore, EntryType entryType,
                        String description) {
        this.transactionId = transactionId;
        this.walletId = walletId;
        this.direction = direction;
        this.amount = amount;
        this.balanceBefore = balanceBefore;
        this.balanceAfter = computeBalanceAfter(direction, balanceBefore, amount);
        this.entryType = entryType;
        this.description = description;
    }

    /**
     * Fabrique : force l'échelle à 2 (HALF_UP) et calcule balanceAfter.
     */
    public static LedgerEntry create(UUID transactionId, UUID walletId, LedgerDirection direction,
                                     BigDecimal amount, BigDecimal balanceBefore, EntryType entryType,
                                     String description) {
        BigDecimal scaled = amount.setScale(2, java.math.RoundingMode.HALF_UP);
        return new LedgerEntry(transactionId, walletId, direction, scaled, balanceBefore,
                entryType, description);
    }

    private static BigDecimal computeBalanceAfter(LedgerDirection direction, BigDecimal before, BigDecimal amount) {
        return direction == LedgerDirection.CREDIT
                ? before.add(amount).setScale(2, java.math.RoundingMode.HALF_UP)
                : before.subtract(amount).setScale(2, java.math.RoundingMode.HALF_UP);
    }
}
