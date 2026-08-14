package com.goursi.ledger.application;

import com.goursi.ledger.domain.command.CreditCommand;
import com.goursi.ledger.domain.command.DebitCommand;
import com.goursi.ledger.domain.command.TransferCommand;
import com.goursi.ledger.domain.exception.DuplicateReversalException;
import com.goursi.ledger.domain.exception.IdempotencyConflictException;
import com.goursi.ledger.domain.exception.InsufficientFundsException;
import com.goursi.ledger.domain.exception.WalletNotFoundException;
import com.goursi.ledger.domain.model.EntryType;
import com.goursi.ledger.domain.model.LedgerBalance;
import com.goursi.ledger.domain.model.LedgerDirection;
import com.goursi.ledger.domain.model.LedgerEntry;
import com.goursi.ledger.domain.result.LedgerEntryResponse;
import com.goursi.ledger.domain.result.TransferResult;
import com.goursi.ledger.infrastructure.messaging.LedgerEventPublisher;
import com.goursi.ledger.infrastructure.metrics.LedgerMetrics;
import com.goursi.ledger.infrastructure.persistence.LedgerBalanceRepository;
import com.goursi.ledger.infrastructure.persistence.LedgerEntryRepository;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Écritures du grand livre — TOUTES en SERIALIZABLE (liste rouge #3).
 * transferAtomic : exactement 4 écritures (débit principal, crédit principal,
 * débit frais, crédit frais collectés), tout ou rien.
 */
@Service
public class LedgerWriteService {

  private static final Logger log = LoggerFactory.getLogger(LedgerWriteService.class);

  private final LedgerEntryRepository entryRepository;
  private final LedgerBalanceRepository balanceRepository;
  private final IdempotencyService idempotencyService;
  private final LedgerEventPublisher eventPublisher;
  private final LedgerMetrics metrics;

  public LedgerWriteService(
      LedgerEntryRepository entryRepository,
      LedgerBalanceRepository balanceRepository,
      IdempotencyService idempotencyService,
      LedgerEventPublisher eventPublisher,
      LedgerMetrics metrics) {
    this.entryRepository = entryRepository;
    this.balanceRepository = balanceRepository;
    this.idempotencyService = idempotencyService;
    this.eventPublisher = eventPublisher;
    this.metrics = metrics;
  }

  // ── Transfert atomique (cœur du système) ─────────────────────────────────────

  @Transactional(isolation = Isolation.SERIALIZABLE, rollbackFor = Exception.class)
  public TransferResult transferAtomic(TransferCommand cmd) {
    long start = System.nanoTime();
    String idemKey = cmd.idempotencyKey().toString();
    String cmdHash = idempotencyService.hash(cmd.toString());

    // 1. Idempotence : déjà traité ?
    var cached = idempotencyService.getCached(idemKey, cmdHash);
    if (cached.isPresent()) {
      log.info("transferAtomic idempotent — clé {} rejouée", idemKey);
      return cached.get();
    }
    IdempotencyService.Claim claim = idempotencyService.claim(idemKey, cmdHash);
    if (claim == IdempotencyService.Claim.IN_FLIGHT) {
      throw new IdempotencyConflictException(idemKey + " (requête en cours — retenter)");
    }
    if (claim == IdempotencyService.Claim.CONFLICT) {
      throw new IdempotencyConflictException(idemKey);
    }

    try {
      // 2. Verrous pessimistes (en complément de SERIALIZABLE)
      LedgerBalance from = requireBalance(cmd.fromWalletId());
      LedgerBalance to = requireBalance(cmd.toWalletId());
      LedgerBalance fees = cmd.effectiveFee().signum() > 0 && cmd.platformFeesWalletId() != null
          ? requireBalance(cmd.platformFeesWalletId())
          : null;

      // 3. Contrôle de fonds : totalDébit = amount + fee ≤ disponible
      BigDecimal fee = cmd.effectiveFee();
      if (cmd.totalDebit().compareTo(from.getAvailableBalance()) > 0) {
        throw new InsufficientFundsException(from.getWalletId(), from.getAvailableBalance(), cmd.totalDebit());
      }

      // 4. Quatre écritures (spec §3.6)
      List<LedgerEntry> entries = new ArrayList<>(4);
      // a) débit principal (émetteur)
      BigDecimal fromBefore = from.debit(cmd.amount());
      entries.add(LedgerEntry.create(
          cmd.transactionId(), from.getWalletId(), LedgerDirection.DEBIT,
          cmd.amount(), fromBefore, EntryType.PRINCIPAL, "Envoi P2P"));
      // b) crédit principal (bénéficiaire)
      BigDecimal toBefore = to.getBalance();
      to.credit(cmd.amount());
      entries.add(LedgerEntry.create(
          cmd.transactionId(), to.getWalletId(), LedgerDirection.CREDIT,
          cmd.amount(), toBefore, EntryType.PRINCIPAL, "Réception P2P"));
      // c) débit frais (émetteur) — si frais > 0
      if (fee.signum() > 0) {
        BigDecimal feeBefore = from.debit(fee);
        entries.add(LedgerEntry.create(
            cmd.transactionId(), from.getWalletId(), LedgerDirection.DEBIT,
            fee, feeBefore, EntryType.FEE, "Frais"));
        // d) crédit frais collectés (plateforme)
        BigDecimal feesBefore = fees.getBalance();
        fees.credit(fee);
        entries.add(LedgerEntry.create(
            cmd.transactionId(), fees.getWalletId(), LedgerDirection.CREDIT,
            fee, feesBefore, EntryType.FEE, "Frais collectés"));
      }

      // 5. Persistance tout ou rien
      entryRepository.saveAll(entries);
      List<LedgerBalance> balances = fees != null ? List.of(from, to, fees) : List.of(from, to);
      balanceRepository.saveAll(balances);

      TransferResult result = new TransferResult(
          cmd.transactionId(), entries,
          from.getBalance(), to.getBalance(),
          fees != null ? fees.getBalance() : BigDecimal.ZERO.setScale(2));

      // 6. Résultat en cache + événement après commit
      idempotencyService.storeResult(idemKey, cmdHash, result);
      eventPublisher.publishCompleted(cmd.transactionId(), "TRANSFER", cmd.amount(), List.of(cmd.fromWalletId(), cmd.toWalletId()));

      metrics.transferOk(System.nanoTime() - start);
      log.info("transferAtomic OK {} ({} entries, idem {})", cmd.transactionId(), entries.size(), idemKey);
      return result;
    } catch (RuntimeException e) {
      idempotencyService.release(idemKey);
      metrics.transferError();
      throw e;
    }
  }

  // ── Crédit / débit unitaires ─────────────────────────────────────────────────

  @Transactional(isolation = Isolation.SERIALIZABLE, rollbackFor = Exception.class)
  public LedgerEntryResponse credit(CreditCommand cmd) {
    long start = System.nanoTime();
    String idemKey = cmd.idempotencyKey().toString();
    String cmdHash = idempotencyService.hash(cmd.toString());
    var cached = idempotencyService.getCached(idemKey, cmdHash);
    if (cached.isPresent()) {
      return new LedgerEntryResponse(
          cached.get().entryIds().get(0), cmd.transactionId(), cmd.walletId(),
          LedgerDirection.CREDIT.name(), cmd.amount(), BigDecimal.ZERO, BigDecimal.ZERO,
          cmd.entryType().name(), null, null);
    }
    IdempotencyService.Claim claim = idempotencyService.claim(idemKey, cmdHash);
    if (claim != IdempotencyService.Claim.OK) {
      throw new IdempotencyConflictException(idemKey);
    }
    try {
      LedgerBalance balance = requireBalance(cmd.walletId());
      BigDecimal before = balance.getBalance();
      balance.credit(cmd.amount());
      LedgerEntry entry = LedgerEntry.create(
          cmd.transactionId(), cmd.walletId(), LedgerDirection.CREDIT,
          cmd.amount(), before, cmd.entryType(), cmd.description() == null ? "Crédit" : cmd.description());
      entryRepository.save(entry);
      balanceRepository.save(balance);
      metrics.creditOk(System.nanoTime() - start);
      log.info("credit OK {} wallet {}", cmd.transactionId(), cmd.walletId());
      return new LedgerEntryResponse(entry.getId(), entry.getTransactionId(), entry.getWalletId(),
          entry.getDirection().name(), entry.getAmount(), entry.getBalanceBefore(),
          entry.getBalanceAfter(), entry.getEntryType().name(), entry.getDescription(), entry.getCreatedAt());
    } catch (RuntimeException e) {
      idempotencyService.release(idemKey);
      throw e;
    }
  }

  @Transactional(isolation = Isolation.SERIALIZABLE, rollbackFor = Exception.class)
  public LedgerEntryResponse debit(DebitCommand cmd) {
    long start = System.nanoTime();
    String idemKey = cmd.idempotencyKey().toString();
    String cmdHash = idempotencyService.hash(cmd.toString());
    var cached = idempotencyService.getCached(idemKey, cmdHash);
    if (cached.isPresent()) {
      return new LedgerEntryResponse(
          cached.get().entryIds().get(0), cmd.transactionId(), cmd.walletId(),
          LedgerDirection.DEBIT.name(), cmd.amount(), BigDecimal.ZERO, BigDecimal.ZERO,
          cmd.entryType().name(), null, null);
    }
    IdempotencyService.Claim claim = idempotencyService.claim(idemKey, cmdHash);
    if (claim != IdempotencyService.Claim.OK) {
      throw new IdempotencyConflictException(idemKey);
    }
    try {
      LedgerBalance balance = requireBalance(cmd.walletId());
      BigDecimal before = balance.debit(cmd.amount());
      LedgerEntry entry = LedgerEntry.create(
          cmd.transactionId(), cmd.walletId(), LedgerDirection.DEBIT,
          cmd.amount(), before, cmd.entryType(), cmd.description() == null ? "Débit" : cmd.description());
      entryRepository.save(entry);
      balanceRepository.save(balance);
      metrics.debitOk(System.nanoTime() - start);
      log.info("debit OK {} wallet {}", cmd.transactionId(), cmd.walletId());
      return new LedgerEntryResponse(entry.getId(), entry.getTransactionId(), entry.getWalletId(),
          entry.getDirection().name(), entry.getAmount(), entry.getBalanceBefore(),
          entry.getBalanceAfter(), entry.getEntryType().name(), entry.getDescription(), entry.getCreatedAt());
    } catch (RuntimeException e) {
      idempotencyService.release(idemKey);
      throw e;
    }
  }

  // ── Reversal (écritures miroir) ──────────────────────────────────────────────

  @Transactional(isolation = Isolation.SERIALIZABLE, rollbackFor = Exception.class)
  public TransferResult reverse(UUID originalTransactionId, String reason, UUID idempotencyKey) {
    String idemKey = idempotencyKey.toString();
    String cmdHash = idempotencyService.hash(originalTransactionId + reason);
    var cached = idempotencyService.getCached(idemKey, cmdHash);
    if (cached.isPresent()) {
      return cached.get();
    }
    IdempotencyService.Claim claim = idempotencyService.claim(idemKey, cmdHash);
    if (claim != IdempotencyService.Claim.OK) {
      throw new IdempotencyConflictException(idemKey);
    }
    try {
      List<LedgerEntry> originals = entryRepository.findByTransactionId(originalTransactionId);
      if (originals.isEmpty()) {
        throw new WalletNotFoundException("transaction " + originalTransactionId);
      }
      if (entryRepository.existsByTransactionIdAndEntryType(originalTransactionId, EntryType.REVERSAL)) {
        throw new DuplicateReversalException(originalTransactionId);
      }
      List<LedgerEntry> mirrors = new ArrayList<>(originals.size());
      java.util.Map<UUID, LedgerBalance> touched = new java.util.HashMap<>();
      for (LedgerEntry original : originals) {
        LedgerBalance balance = touched.computeIfAbsent(original.getWalletId(), this::requireBalance);
        LedgerDirection mirrorDirection =
            original.getDirection() == LedgerDirection.DEBIT ? LedgerDirection.CREDIT : LedgerDirection.DEBIT;
        BigDecimal before;
        if (original.getDirection() == LedgerDirection.DEBIT) {
          // on rembourse le débit : crédit du wallet
          before = balance.getBalance();
          balance.credit(original.getAmount());
        } else {
          // on reprend le crédit : débit du wallet
          before = balance.debit(original.getAmount());
        }
        mirrors.add(LedgerEntry.create(
            originalTransactionId, original.getWalletId(), mirrorDirection,
            original.getAmount(), before, EntryType.REVERSAL,
            reason == null ? "Reversal" : "Reversal — " + reason));
      }
      entryRepository.saveAll(mirrors);
      balanceRepository.saveAll(touched.values());
      TransferResult result = new TransferResult(
          originalTransactionId, mirrors, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
      idempotencyService.storeResult(idemKey, cmdHash, result);
      eventPublisher.publishReversed(originalTransactionId, "TRANSFER",
          originals.get(0).getAmount(), new ArrayList<>(touched.keySet()));
      metrics.reversalOk();
      log.info("reverse OK transaction {} ({} miroirs)", originalTransactionId, mirrors.size());
      return result;
    } catch (RuntimeException e) {
      idempotencyService.release(idemKey);
      throw e;
    }
  }

  private LedgerBalance requireBalance(UUID walletId) {
    return balanceRepository.findByWalletIdForUpdate(walletId)
        .orElseThrow(() -> new WalletNotFoundException(walletId));
  }
}
