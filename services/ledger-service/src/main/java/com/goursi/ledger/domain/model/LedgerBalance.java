package com.goursi.ledger.domain.model;

import com.goursi.ledger.domain.exception.InsufficientFundsException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.UpdateTimestamp;

/**
 * Solde courant d'un wallet — @Version = verrou optimiste anti-corruption
 * sous concurrence (2 écritures simultanées → OptimisticLockException).
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
  private Long version = 0L;

  @UpdateTimestamp
  @Column(name = "last_updated_at", nullable = false)
  private Instant lastUpdatedAt;

  public LedgerBalance(UUID walletId) {
    this.walletId = walletId;
  }

  public LedgerBalance(UUID walletId, BigDecimal initialBalance) {
    this.walletId = walletId;
    this.balance = initialBalance.setScale(2, java.math.RoundingMode.HALF_UP);
  }

  /** Solde utilisable = balance - frozenBalance. */
  public BigDecimal getAvailableBalance() {
    return balance.subtract(frozenBalance).setScale(2, java.math.RoundingMode.HALF_UP);
  }

  /** Crédite le wallet. Montant <= 0 → IllegalArgumentException. */
  public LedgerBalance credit(BigDecimal amount) {
    if (amount == null || amount.signum() <= 0) {
      throw new IllegalArgumentException("Crédit doit être > 0 (reçu " + amount + ")");
    }
    this.balance = this.balance.add(amount).setScale(2, java.math.RoundingMode.HALF_UP);
    return this;
  }

  /**
   * Débite le wallet. Montant > disponible → InsufficientFundsException.
   * Retourne le solde AVANT débit (pour l'écriture balance_before).
   */
  public BigDecimal debit(BigDecimal amount) {
    if (amount == null || amount.signum() <= 0) {
      throw new IllegalArgumentException("Débit doit être > 0 (reçu " + amount + ")");
    }
    BigDecimal available = getAvailableBalance();
    if (amount.compareTo(available) > 0) {
      throw new InsufficientFundsException(walletId, available, amount);
    }
    this.balance = this.balance.subtract(amount).setScale(2, java.math.RoundingMode.HALF_UP);
    return this.balance.add(amount).setScale(2, java.math.RoundingMode.HALF_UP);
  }

  /** Gèle un montant (AML). Retourne le solde disponible avant gel. */
  public BigDecimal freeze(BigDecimal amount) {
    if (amount == null || amount.signum() < 0) {
      throw new IllegalArgumentException("Gel doit être >= 0 (reçu " + amount + ")");
    }
    BigDecimal available = getAvailableBalance();
    if (amount.compareTo(available) > 0) {
      throw new InsufficientFundsException(walletId, available, amount);
    }
    this.frozenBalance = this.frozenBalance.add(amount).setScale(2, java.math.RoundingMode.HALF_UP);
    return available;
  }

  /** Dégèle un montant (levée de gel). */
  public LedgerBalance unfreeze(BigDecimal amount) {
    if (amount == null || amount.signum() < 0) {
      throw new IllegalArgumentException("Dégel doit être >= 0 (reçu " + amount + ")");
    }
    if (amount.compareTo(this.frozenBalance) > 0) {
      throw new IllegalArgumentException(
          "Dégel (" + amount + ") supérieur au gelé (" + this.frozenBalance + ") pour wallet " + walletId);
    }
    this.frozenBalance = this.frozenBalance.subtract(amount).setScale(2, java.math.RoundingMode.HALF_UP);
    return this;
  }
}
