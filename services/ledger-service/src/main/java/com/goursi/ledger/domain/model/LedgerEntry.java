package com.goursi.ledger.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Immutable;

/**
 * Écriture comptable — IMMUABLE par construction (@Immutable) ET en base (triggers V5).
 * Jamais de setter public, jamais d'update/delete (liste rouge #4/#5).
 */
@Entity
@Table(name = "ledger_entries", schema = "ledger")
@Immutable
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LedgerEntry {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(name = "transaction_id", nullable = false, updatable = false)
  private UUID transactionId;

  @Column(name = "wallet_id", nullable = false, updatable = false)
  private UUID walletId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, updatable = false, length = 10)
  private LedgerDirection direction;

  @Column(nullable = false, updatable = false, precision = 15, scale = 2)
  private BigDecimal amount;

  @Column(name = "balance_before", nullable = false, updatable = false, precision = 15, scale = 2)
  private BigDecimal balanceBefore;

  @Column(name = "balance_after", nullable = false, updatable = false, precision = 15, scale = 2)
  private BigDecimal balanceAfter;

  @Enumerated(EnumType.STRING)
  @Column(name = "entry_type", nullable = false, updatable = false, length = 20)
  private EntryType entryType;

  @Column(updatable = false)
  private String description;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  private LedgerEntry(
      UUID transactionId,
      UUID walletId,
      LedgerDirection direction,
      BigDecimal amount,
      BigDecimal balanceBefore,
      EntryType entryType,
      String description) {
    this.transactionId = transactionId;
    this.walletId = walletId;
    this.direction = direction;
    this.amount = amount.setScale(2, java.math.RoundingMode.HALF_UP);
    this.balanceBefore = balanceBefore.setScale(2, java.math.RoundingMode.HALF_UP);
    this.balanceAfter =
        switch (direction) {
          case CREDIT -> balanceBefore.add(amount).setScale(2, java.math.RoundingMode.HALF_UP);
          case DEBIT -> balanceBefore.subtract(amount).setScale(2, java.math.RoundingMode.HALF_UP);
        };
    this.entryType = entryType;
    this.description = description;
  }

  /**
   * Factory — force l'échelle 2 (HALF_UP) et calcule balanceAfter.
   * balanceAfter = balanceBefore ± amount.
   */
  public static LedgerEntry create(
      UUID transactionId,
      UUID walletId,
      LedgerDirection direction,
      BigDecimal amount,
      BigDecimal balanceBefore,
      EntryType entryType,
      String description) {
    if (amount == null || amount.signum() <= 0) {
      throw new IllegalArgumentException("Montant d'écriture doit être > 0 (reçu " + amount + ")");
    }
    if (balanceBefore == null) {
      throw new IllegalArgumentException("balanceBefore ne peut pas être null");
    }
    return new LedgerEntry(transactionId, walletId, direction, amount, balanceBefore, entryType, description);
  }

  @PrePersist
  void enforceScale() {
    this.amount = amount.setScale(2, java.math.RoundingMode.HALF_UP);
    this.balanceBefore = balanceBefore.setScale(2, java.math.RoundingMode.HALF_UP);
    this.balanceAfter = balanceAfter.setScale(2, java.math.RoundingMode.HALF_UP);
  }
}
