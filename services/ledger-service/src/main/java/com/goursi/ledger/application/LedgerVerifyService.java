package com.goursi.ledger.application;

import com.goursi.ledger.infrastructure.persistence.LedgerEntryRepository;
import java.math.BigDecimal;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Contrôle d'intégrité COBAC (GOURSI-016c) :
 * pour chaque wallet, solde stocké == SUM(CREDIT) - SUM(DEBIT) des écritures.
 * Écart > 0.01 → signalé. Aucune écriture, lecture seule.
 */
@Service
@Transactional(readOnly = true)
public class LedgerVerifyService {

  private static final Logger log = LoggerFactory.getLogger(LedgerVerifyService.class);
  private static final BigDecimal TOLERANCE = new BigDecimal("0.01");

  private final LedgerEntryRepository entryRepository;
  private final com.goursi.ledger.infrastructure.persistence.LedgerBalanceRepository balanceRepository;

  public LedgerVerifyService(
      LedgerEntryRepository entryRepository,
      com.goursi.ledger.infrastructure.persistence.LedgerBalanceRepository balanceRepository) {
    this.entryRepository = entryRepository;
    this.balanceRepository = balanceRepository;
  }

  public record VerifyReport(boolean balanced, List<Discrepancy> discrepancies, int walletsChecked) {}

  public record Discrepancy(String walletId, BigDecimal storedBalance, BigDecimal computedBalance, BigDecimal delta) {}

  /** Vérifie l'équilibre de TOUS les wallets (vues audit). */
  public VerifyReport verifyAll() {
    List<Object[]> computed = computedBalances();
    List<Discrepancy> discrepancies = new java.util.ArrayList<>();
    for (Object[] row : computed) {
      var walletId = (java.util.UUID) row[0];
      var computedBalance = (BigDecimal) row[1];
      var stored = balanceRepository.findById(walletId);
      if (stored.isEmpty()) {
        discrepancies.add(new Discrepancy(walletId.toString(), BigDecimal.ZERO, computedBalance, computedBalance));
        continue;
      }
      BigDecimal storedBalance = stored.get().getBalance();
      BigDecimal delta = storedBalance.subtract(computedBalance).abs();
      if (delta.compareTo(TOLERANCE) > 0) {
        discrepancies.add(new Discrepancy(walletId.toString(), storedBalance, computedBalance, delta));
      }
    }
    boolean balanced = discrepancies.isEmpty();
    if (!balanced) {
      log.error("ÉQUILIBRE COMPTABLE EN ÉCART : {} divergence(s)", discrepancies.size());
    } else {
      log.info("Vérification COBAC OK : {} wallets équilibrés", computed.size());
    }
    return new VerifyReport(balanced, discrepancies, computed.size());
  }

  /** Solde calculé par wallet depuis les écritures (SUM(CREDIT) - SUM(DEBIT)). */
  private List<Object[]> computedBalances() {
    return entryRepository.computedBalancesByWallet();
  }
}
