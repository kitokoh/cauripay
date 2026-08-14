package com.goursi.ledger.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

/** Snapshot nightly du solde d'un wallet (contrôle d'intégrité COBAC). */
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
  private Instant createdAt;

  public LedgerCheckpoint(UUID walletId, BigDecimal balanceSnapshot, long entriesCount) {
    this.walletId = walletId;
    this.balanceSnapshot = balanceSnapshot.setScale(2, java.math.RoundingMode.HALF_UP);
    this.entriesCount = entriesCount;
  }
}
