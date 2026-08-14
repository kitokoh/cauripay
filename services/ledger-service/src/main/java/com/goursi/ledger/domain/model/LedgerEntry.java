package com.goursi.ledger.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Immutable;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.UUID;

/**
 * GOURSI-012a — écriture comptable. Immuable en JPA (@Immutable) ET en base
 * (triggers V5). Sa factory calcule balanceAfter et force l'échelle à 2.
 */
@Entity
@Immutable
@Table(name = "ledger_entries", schema = "ledger")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LedgerEntry {

    public enum Direction { DEBIT, CREDIT }

    public enum EntryType { PRINCIPAL, FEE, COMMISSION, REVERSAL }

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
    private Direction direction;

    @Column(nullable = false, updatable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(name = "balance_before", nullable = false, updatable = false, precision = 15, scale = 2)
    private BigDecimal balanceBefore;

    @Column(name = "balance_after", nullable = false, updatable = false, precision = 15, scale = 2)
    private BigDecimal balanceAfter;

    @Enumerated(EnumType.STRING)
    @Column(name = "entry_type", nullable = false, updatable = false)
    private EntryType entryType;

    @Column(updatable = false)
    private String description;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    private LedgerEntry(UUID transactionId, UUID walletId, Direction direction, BigDecimal amount,
                        BigDecimal balanceBefore, EntryType entryType, String description) {
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
     * Factory : échelle forcée à 2 (HALF_UP), balanceAfter = balanceBefore ± amount.
     * Aucune entrée invalide (montant <= 0) ne peut être créée.
     */
    public static LedgerEntry create(UUID transactionId, UUID walletId, Direction direction,
                                     BigDecimal amount, BigDecimal balanceBefore,
                                     EntryType entryType, String description) {
        BigDecimal normalized = amount.setScale(2, RoundingMode.HALF_UP);
        if (normalized.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Montant d'écriture doit être strictement positif");
        }
        return new LedgerEntry(transactionId, walletId, direction, normalized, balanceBefore.setScale(2, RoundingMode.HALF_UP), entryType, description);
    }

    private static BigDecimal computeBalanceAfter(Direction direction, BigDecimal before, BigDecimal amount) {
        return direction == Direction.DEBIT
            ? before.subtract(amount)
            : before.add(amount);
    }
}
