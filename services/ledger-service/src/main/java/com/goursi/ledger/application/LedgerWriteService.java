package com.goursi.ledger.application;

import com.goursi.ledger.domain.command.CreditCommand;
import com.goursi.ledger.domain.command.DebitCommand;
import com.goursi.ledger.domain.command.TransferCommand;
import com.goursi.ledger.domain.exception.InsufficientFundsException;
import com.goursi.ledger.domain.exception.WalletNotFoundException;
import com.goursi.ledger.domain.model.EntryType;
import com.goursi.ledger.domain.model.LedgerBalance;
import com.goursi.ledger.domain.model.LedgerDirection;
import com.goursi.ledger.domain.model.LedgerEntry;
import com.goursi.ledger.domain.repository.LedgerBalanceRepository;
import com.goursi.ledger.domain.repository.LedgerEntryRepository;
import com.goursi.ledger.domain.result.TransferResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Seul service autorisé à écrire les soldes wallets (règle absolue n°1).
 * transferAtomic : exactement 4 écritures (débit, crédit, frais, frais collectés)
 * dans une transaction SERIALIZABLE, tout ou rien.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LedgerWriteService {

    private final LedgerBalanceRepository balanceRepository;
    private final LedgerEntryRepository entryRepository;
    private final IdempotencyService idempotencyService;
    private final LedgerEventPublisher eventPublisher;

    @Transactional(isolation = Isolation.SERIALIZABLE, rollbackFor = Exception.class)
    public TransferResult transferAtomic(TransferCommand cmd) {
        // 1) Idempotence : retourne le résultat en cache si déjà exécuté
        idempotencyService.assertNoConflict(cmd.idempotencyKey().toString(), cmd);
        var cached = idempotencyService.get(cmd.idempotencyKey().toString());
        if (cached.isPresent()) {
            log.debug("transferAtomic: cache hit pour {}", cmd.idempotencyKey());
            return cached.get();
        }

        // 2) Verrou pessimiste sur les 3 wallets
        LedgerBalance from = loadForUpdate(cmd.fromWalletId());
        LedgerBalance to = loadForUpdate(cmd.toWalletId());
        LedgerBalance fees = loadForUpdate(cmd.platformFeesWalletId());

        // 3) Contrôle total débité vs disponible
        var totalDebit = cmd.amount().add(cmd.feeAmount());
        if (from.getAvailableBalance().compareTo(totalDebit) < 0) {
            throw new InsufficientFundsException(cmd.fromWalletId(), from.getAvailableBalance(), totalDebit);
        }

        // 4) Création des 4 écritures (spec §3.6)
        UUID txId = cmd.transactionId();
        var fromBefore = from.getBalance();
        var toBefore = to.getBalance();
        var feesBefore = fees.getBalance();

        LedgerEntry debitPrincipal = LedgerEntry.create(txId, cmd.fromWalletId(),
                LedgerDirection.DEBIT, cmd.amount(), fromBefore, EntryType.PRINCIPAL, "Envoi P2P");
        LedgerEntry creditPrincipal = LedgerEntry.create(txId, cmd.toWalletId(),
                LedgerDirection.CREDIT, cmd.amount(), toBefore, EntryType.PRINCIPAL, "Réception P2P");
        LedgerEntry debitFee = LedgerEntry.create(txId, cmd.fromWalletId(),
                LedgerDirection.DEBIT, cmd.feeAmount(), fromBefore.subtract(cmd.amount()), EntryType.FEE, "Frais");
        LedgerEntry creditFee = LedgerEntry.create(txId, cmd.platformFeesWalletId(),
                LedgerDirection.CREDIT, cmd.feeAmount(), feesBefore, EntryType.COMMISSION, "Frais collectés");

        // 5) Mutations des soldes
        from.debit(cmd.amount());
        from.debit(cmd.feeAmount());
        to.credit(cmd.amount());
        fees.credit(cmd.feeAmount());

        // 6) Persistance (tout ou rien)
        entryRepository.saveAll(List.of(debitPrincipal, creditPrincipal, debitFee, creditFee));
        balanceRepository.saveAll(List.of(from, to, fees));

        // 7) Résultat
        TransferResult result = TransferResult.of(txId,
                List.of(debitPrincipal, creditPrincipal, debitFee, creditFee),
                from.getBalance(), to.getBalance());

        // 8) Cache d'idempotence
        idempotencyService.store(cmd.idempotencyKey().toString(), result);

        // 9) Événement APRÈS commit (voir publisher)
        eventPublisher.publishAfterCommit(txId, "transaction.completed", cmd.amount(), "COMPLETED",
                List.of(cmd.fromWalletId(), cmd.toWalletId(), cmd.platformFeesWalletId()));
        return result;
    }

    @Transactional(isolation = Isolation.SERIALIZABLE, rollbackFor = Exception.class)
    public com.goursi.ledger.domain.result.LedgerEntryResponse credit(CreditCommand cmd) {
        idempotencyService.get(cmd.idempotencyKey().toString()).ifPresent(r -> {
            throw new com.goursi.ledger.domain.exception.IdempotencyConflictException(cmd.idempotencyKey().toString());
        });
        LedgerBalance wallet = loadForUpdate(cmd.walletId());
        var before = wallet.getBalance();
        wallet.credit(cmd.amount());
        LedgerEntry entry = LedgerEntry.create(cmd.transactionId(), cmd.walletId(),
                LedgerDirection.CREDIT, cmd.amount(), before, cmd.entryType(), "Crédit");
        entryRepository.save(entry);
        balanceRepository.save(wallet);
        idempotencyService.store(cmd.idempotencyKey().toString(),
                TransferResult.of(cmd.transactionId(), List.of(entry), before, wallet.getBalance()));
        return new com.goursi.ledger.domain.result.LedgerEntryResponse(entry.getId(), before, wallet.getBalance());
    }

    @Transactional(isolation = Isolation.SERIALIZABLE, rollbackFor = Exception.class)
    public com.goursi.ledger.domain.result.LedgerEntryResponse debit(DebitCommand cmd) {
        idempotencyService.get(cmd.idempotencyKey().toString()).ifPresent(r -> {
            throw new com.goursi.ledger.domain.exception.IdempotencyConflictException(cmd.idempotencyKey().toString());
        });
        LedgerBalance wallet = loadForUpdate(cmd.walletId());
        var before = wallet.getBalance();
        wallet.debit(cmd.amount());
        LedgerEntry entry = LedgerEntry.create(cmd.transactionId(), cmd.walletId(),
                LedgerDirection.DEBIT, cmd.amount(), before, cmd.entryType(), "Débit");
        entryRepository.save(entry);
        balanceRepository.save(wallet);
        idempotencyService.store(cmd.idempotencyKey().toString(),
                TransferResult.of(cmd.transactionId(), List.of(entry), before, wallet.getBalance()));
        return new com.goursi.ledger.domain.result.LedgerEntryResponse(entry.getId(), before, wallet.getBalance());
    }

    /** Écritures miroir d'une transaction (EntryType.REVERSAL). */
    @Transactional(isolation = Isolation.SERIALIZABLE, rollbackFor = Exception.class)
    public TransferResult reverse(UUID originalTransactionId, String reason, UUID idempotencyKey) {
        String key = idempotencyKey.toString();
        var cached = idempotencyService.get(key);
        if (cached.isPresent()) {
            return cached.get();
        }

        List<LedgerEntry> originals = entryRepository.findByTransactionId(originalTransactionId);
        if (originals.isEmpty()) {
            throw new com.goursi.ledger.domain.exception.WalletNotFoundException(originalTransactionId);
        }

        // Déjà reversé ?
        boolean alreadyReversed = originals.stream().anyMatch(e -> e.getEntryType() == EntryType.REVERSAL);
        if (alreadyReversed) {
            throw new com.goursi.ledger.domain.exception.IdempotencyConflictException(
                    "transaction déjà reversée: " + originalTransactionId);
        }

        UUID reversalTxId = UUID.randomUUID();
        var builder = new java.util.ArrayList<LedgerEntry>();
        for (LedgerEntry original : originals) {
            LedgerBalance wallet = loadForUpdate(original.getWalletId());
            var before = wallet.getBalance();
            LedgerDirection inverse = original.getDirection() == LedgerDirection.DEBIT
                    ? LedgerDirection.CREDIT : LedgerDirection.DEBIT;
            if (inverse == LedgerDirection.DEBIT) {
                wallet.debit(original.getAmount());
            } else {
                wallet.credit(original.getAmount());
            }
            LedgerEntry mirror = LedgerEntry.create(reversalTxId, original.getWalletId(),
                    inverse, original.getAmount(), before, EntryType.REVERSAL,
                    "Reversal: " + (reason == null ? "" : reason));
            builder.add(mirror);
            balanceRepository.save(wallet);
        }
        entryRepository.saveAll(builder);

        TransferResult result = TransferResult.of(reversalTxId, builder, null, null);
        idempotencyService.store(key, result);
        eventPublisher.publishAfterCommit(reversalTxId, "transaction.reversed",
                originals.getFirst().getAmount(), "REVERSED",
                originals.stream().map(LedgerEntry::getWalletId).distinct().toList());
        return result;
    }

    private LedgerBalance loadForUpdate(UUID walletId) {
        return balanceRepository.findByWalletIdForUpdate(walletId)
                .orElseThrow(() -> new WalletNotFoundException(walletId));
    }
}
