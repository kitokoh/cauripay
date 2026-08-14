package com.goursi.ledger.domain.model;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Snapshot nightly d'un solde wallet (contrôle COBAC, reconstitution).
 * Aligné sur V4 (unicité wallet + jour en base).
 */
@Entity
@Table(name = "ledger_checkpoints", schema = "ledger")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LedgerCheckpoint {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "wallet_id", nullable = false)
    private UUID walletId;

    @Column(name = "balance_snapshot", nullable = false, precision = 15, scale = 2)
    private BigDecimal balanceSnapshot;

    @Column(name = "entries_count", nullable = false)
    private long entriesCount;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    public static LedgerCheckpoint of(UUID walletId, BigDecimal balanceSnapshot, long entriesCount) {
        LedgerCheckpoint c = new LedgerCheckpoint();
        c.walletId = walletId;
        c.balanceSnapshot = balanceSnapshot.setScale(2, java.math.RoundingMode.HALF_UP);
        c.entriesCount = entriesCount;
        return c;
    }
}
