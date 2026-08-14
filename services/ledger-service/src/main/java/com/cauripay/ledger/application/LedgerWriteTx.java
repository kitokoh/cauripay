package com.cauripay.ledger.application;

import com.cauripay.ledger.application.command.CreditCommand;
import com.cauripay.ledger.application.command.DebitCommand;
import com.cauripay.ledger.application.command.ReverseCommand;
import com.cauripay.ledger.application.command.TransferCommand;
import com.cauripay.ledger.application.result.TransferResult;
import com.cauripay.ledger.common.InsufficientFundsException;
import com.cauripay.ledger.common.NotFoundException;
import com.cauripay.ledger.domain.EntryType;
import com.cauripay.ledger.domain.LedgerBalance;
import com.cauripay.ledger.domain.LedgerEntry;
import com.cauripay.ledger.domain.LedgerEntryFactory;
import com.cauripay.ledger.infrastructure.events.LedgerEventPublisher;
import com.cauripay.ledger.infrastructure.persistence.LedgerBalanceJpaRepository;
import com.cauripay.ledger.infrastructure.persistence.LedgerEntryJpaRepository;
import com.cauripay.ledger.metrics.LedgerMetrics;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Écritures ledger en transaction {@code SERIALIZABLE} (GOURSI-014b/c/d).
 *
 * <p>Ce bean est distinct de la façade {@link LedgerWriteService} pour que les
 * annotations {@code @Transactional} soient appliquées par le proxy Spring
 * (pas d'auto-invocation). Toute la logique d'écriture vit ici.
 */
@Service
public class LedgerWriteTx {

    private static final Logger LOG = LoggerFactory.getLogger(LedgerWriteTx.class);

    private final LedgerEntryJpaRepository entryRepository;
    private final LedgerBalanceJpaRepository balanceRepository;
    private final LedgerEventPublisher eventPublisher;
    private final LedgerMetrics metrics;
    private final IdempotencyService idempotencyService;

    public LedgerWriteTx(
        LedgerEntryJpaRepository entryRepository,
        LedgerBalanceJpaRepository balanceRepository,
        LedgerEventPublisher eventPublisher,
        LedgerMetrics metrics,
        IdempotencyService idempotencyService) {
        this.entryRepository = entryRepository;
        this.balanceRepository = balanceRepository;
        this.eventPublisher = eventPublisher;
        this.metrics = metrics;
        this.idempotencyService = idempotencyService;
    }

    /**
     * Transfer atomique : exactement 4 écritures (débit/crédit principal,
     * débit/crédit frais) en isolation SERIALIZABLE (GOURSI-014b, DoD #1).
     */
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public TransferResult transferAtomic(TransferCommand command) {
        final LedgerBalance from = requireBalance(command.fromWalletId());
        // Auto-provisioning : le bénéficiaire et le wallet de frais peuvent être
        // créés au premier contact (frontière ADR-004 : api-core crée le wallet
        // applicatif, le ledger provisionne le compte comptable).
        final LedgerBalance to = loadOrCreate(command.toWalletId());
        final LedgerBalance fees = command.platformFeesWalletId() == null
            ? null
            : loadOrCreate(command.platformFeesWalletId());

        final BigDecimal fee = command.effectiveFee();
        if (fee.signum() > 0 && fees == null) {
            throw new IllegalArgumentException(
                "Des frais sont demandés mais platformFeesWalletId est absent.");
        }

        final BigDecimal totalDebit = command.amount().add(fee);
        if (from.balance().compareTo(totalDebit) < 0) {
            metrics.error("insufficient_funds");
            throw new InsufficientFundsException(command.fromWalletId());
        }

        final List<LedgerEntry> entries = LedgerEntryFactory.transferEntries(
            command.transactionId(),
            from,
            to,
            fees,
            command.amount(),
            fee,
            command.description());

        entryRepository.saveAll(entries);
        balanceRepository.save(from);
        balanceRepository.save(to);
        if (fees != null) {
            balanceRepository.save(fees);
        }

        final TransferResult result = TransferResult.completed(
            command.transactionId(),
            entries.stream().map(LedgerEntry::id).toList(),
            from.walletId(),
            to.walletId(),
            fees == null ? null : fees.walletId());

        afterCommit(command.idempotencyKey(), result, "completed");
        return result;
    }

    /** Crédit unitaire (GOURSI-014c) — provisionne le wallet s'il n'existe pas. */
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public TransferResult credit(CreditCommand command) {
        final LedgerBalance balance = loadOrCreate(command.walletId());
        final LedgerEntry entry = LedgerEntryFactory.singleEntry(
            command.transactionId(), balance, com.cauripay.ledger.domain.LedgerDirection.CREDIT,
            command.amount(), EntryType.PRINCIPAL, command.description());
        entryRepository.save(entry);
        balanceRepository.save(balance);

        final TransferResult result = TransferResult.completed(
            command.transactionId(), List.of(entry.id()), balance.walletId(), null, null);
        afterCommit(command.idempotencyKey(), result, "completed");
        return result;
    }

    /** Débit unitaire (GOURSI-014c) — solde insuffisant → 422. */
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public TransferResult debit(DebitCommand command) {
        final LedgerBalance balance = requireBalance(command.walletId());
        if (balance.balance().compareTo(command.amount()) < 0) {
            metrics.error("insufficient_funds");
            throw new InsufficientFundsException(command.walletId());
        }
        final LedgerEntry entry = LedgerEntryFactory.singleEntry(
            command.transactionId(), balance, com.cauripay.ledger.domain.LedgerDirection.DEBIT,
            command.amount(), EntryType.PRINCIPAL, command.description());
        entryRepository.save(entry);
        balanceRepository.save(balance);

        final TransferResult result = TransferResult.completed(
            command.transactionId(), List.of(entry.id()), balance.walletId(), null, null);
        afterCommit(command.idempotencyKey(), result, "completed");
        return result;
    }

    /**
     * Reversal (GOURSI-014d) : écritures miroir REVERSAL de la transaction
     * originale (directions inversées, soldes restaurés).
     */
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public TransferResult reverse(ReverseCommand command) {
        final List<LedgerEntry> originals =
            entryRepository.findByTransactionIdOrderByCreatedAtAsc(command.originalTransactionId());
        if (originals.isEmpty()) {
            throw new NotFoundException("Transaction introuvable : " + command.originalTransactionId());
        }

        final UUID reversalTransactionId = UUID.randomUUID();
        final List<LedgerEntry> reversals = LedgerEntryFactory.reversalEntries(
            reversalTransactionId, originals, this::requireBalance);

        entryRepository.saveAll(reversals);
        // Les soldes mutés par la factory sont des entités managées (fetcher =
        // requireBalance) : Hibernate les flush automatiquement au commit.

        final TransferResult result = TransferResult.completed(
            reversalTransactionId,
            reversals.stream().map(LedgerEntry::id).toList(),
            command.originalTransactionId(),
            null,
            null);

        afterCommit(command.idempotencyKey(), result, "reversed");
        return result;
    }

    private LedgerBalance requireBalance(UUID walletId) {
        return balanceRepository.findById(walletId)
            .orElseThrow(() -> NotFoundException.wallet(walletId));
    }

    /** Charge le solde ou crée un compte à zéro (premier crédit / bénéficiaire). */
    private LedgerBalance loadOrCreate(UUID walletId) {
        return balanceRepository.findById(walletId)
            .orElseGet(() -> new LedgerBalance(walletId));
    }

    /**
     * Hook afterCommit : le résultat idempotent et l'événement ne sont publiés
     * qu'après le commit (jamais d'événement d'une transaction annulée — spec §3.7).
     */
    private void afterCommit(String idempotencyKey, TransferResult result, String status) {
        TransactionSynchronizationManager.registerSynchronization(
            new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    idempotencyService.complete(idempotencyKey, result);
                    eventPublisher.publish(result, status);
                    metrics.transfer(status);
                    LOG.info("Ledger {} — transaction {} ({} écritures)",
                        status, result.transactionId(), result.ledgerEntryIds().size());
                }
            });
    }
}
