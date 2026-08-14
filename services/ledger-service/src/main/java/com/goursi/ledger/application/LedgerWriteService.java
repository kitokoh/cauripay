package com.goursi.ledger.application;

import com.goursi.ledger.domain.command.CreditCommand;
import com.goursi.ledger.domain.command.DebitCommand;
import com.goursi.ledger.domain.command.ReverseCommand;
import com.goursi.ledger.domain.command.TransferCommand;
import com.goursi.ledger.domain.exception.IdempotencyConflictException;
import com.goursi.ledger.domain.exception.InsufficientFundsException;
import com.goursi.ledger.domain.exception.WalletNotFoundException;
import com.goursi.ledger.domain.model.LedgerBalance;
import com.goursi.ledger.domain.model.LedgerEntry;
import com.goursi.ledger.domain.model.LedgerEntry.Direction;
import com.goursi.ledger.domain.model.LedgerEntry.EntryType;
import com.goursi.ledger.domain.repository.LedgerBalanceRepository;
import com.goursi.ledger.domain.repository.LedgerEntryRepository;
import com.goursi.ledger.domain.result.LedgerEntryResponse;
import com.goursi.ledger.domain.result.TransferResult;
import com.goursi.ledger.infrastructure.event.LedgerEventPublisher;
import com.goursi.ledger.infrastructure.metrics.LedgerMetrics;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * GOURSI-014b/c/d — le write service est la SEULE porte d'écriture des soldes.
 * transferAtomic : exactement 4 écritures ledger dans une transaction
 * SERIALIZABLE, tout ou rien. Idempotence vérifiée AVANT toute écriture.
 * Règle absolue : seuls ces endpoints modifient les soldes.
 */
@Service
public class LedgerWriteService {

    private static final Logger log = LoggerFactory.getLogger(LedgerWriteService.class);

    private final LedgerBalanceRepository balanceRepository;
    private final LedgerEntryRepository entryRepository;
    private final IdempotencyService idempotencyService;
    private final LedgerEventPublisher eventPublisher;
    private final LedgerMetrics metrics;

    public LedgerWriteService(LedgerBalanceRepository balanceRepository,
                              LedgerEntryRepository entryRepository,
                              IdempotencyService idempotencyService,
                              LedgerEventPublisher eventPublisher,
                              LedgerMetrics metrics) {
        this.balanceRepository = balanceRepository;
        this.entryRepository = entryRepository;
        this.idempotencyService = idempotencyService;
        this.eventPublisher = eventPublisher;
        this.metrics = metrics;
    }

    // ------------------------------------------------------------------ transfer

    /**
     * Transfert P2P : 4 écritures (débit principal, crédit principal, débit frais,
     * crédit frais collectés) + mutations de solde, atomiques.
     */
    @Transactional(isolation = Isolation.SERIALIZABLE, rollbackFor = Exception.class)
    public TransferResult transferAtomic(TransferCommand cmd) {
        var sample = metrics.startTransfer();
        try {
            return doTransfer(cmd);
        } catch (InsufficientFundsException e) {
            metrics.error("insufficient_funds");
            throw e;
        } catch (IdempotencyConflictException e) {
            metrics.error("idempotency_conflict");
            throw e;
        } finally {
            metrics.stopTransfer(sample);
        }
    }

    private TransferResult doTransfer(TransferCommand cmd) {
        String idemKey = "transfer:" + cmd.idempotencyKey();
        var cached = idempotencyService.get(idemKey);
        if (cached.isPresent()) {
            String fingerprint = fingerprint(cmd);
            if (!MessageDigest.isEqual(fingerprint.getBytes(java.nio.charset.StandardCharsets.UTF_8),
                                       cached.get().fingerprint().getBytes(java.nio.charset.StandardCharsets.UTF_8))) {
                throw new IdempotencyConflictException(cmd.idempotencyKey().toString());
            }
            return cached.get().result();
        }

        LedgerBalance from = balanceRepository.findByWalletIdForUpdate(cmd.fromWalletId())
            .orElseThrow(() -> new WalletNotFoundException(cmd.fromWalletId().toString()));
        LedgerBalance to = balanceRepository.findByWalletIdForUpdate(cmd.toWalletId())
            .orElseThrow(() -> new WalletNotFoundException(cmd.toWalletId().toString()));
        LedgerBalance fees = balanceRepository.findByWalletIdForUpdate(cmd.platformFeesWalletId())
            .orElseThrow(() -> new WalletNotFoundException(cmd.platformFeesWalletId().toString()));

        BigDecimal totalDebit = cmd.totalDebit();
        if (totalDebit.compareTo(from.getAvailableBalance()) > 0) {
            throw new InsufficientFundsException(from.getWalletId().toString(), from.getAvailableBalance(), totalDebit);
        }

        UUID txId = cmd.transactionId();
        BigDecimal fromBefore = from.getBalance();
        BigDecimal toBefore = to.getBalance();
        BigDecimal feesBefore = fees.getBalance();

        // Chaîne de soldes cohérente : e1 (amount) puis e3 (frais) sur le wallet émetteur.
        List<LedgerEntry> entries = new ArrayList<>();
        LedgerEntry e1 = LedgerEntry.create(txId, from.getWalletId(), Direction.DEBIT, cmd.amount(), fromBefore, EntryType.PRINCIPAL, "Envoi P2P");
        entries.add(e1);
        LedgerEntry e2 = LedgerEntry.create(txId, to.getWalletId(), Direction.CREDIT, cmd.amount(), toBefore, EntryType.PRINCIPAL, "Réception P2P");
        entries.add(e2);

        from.debit(cmd.amount());
        to.credit(cmd.amount());

        // Frais : seulement si > 0 (un transfert sans frais n'écrit pas d'entrées nulles).
        boolean hasFees = cmd.feeAmount().compareTo(BigDecimal.ZERO) > 0;
        if (hasFees) {
            LedgerEntry e3 = LedgerEntry.create(txId, from.getWalletId(), Direction.DEBIT, cmd.feeAmount(), e1.getBalanceAfter(), EntryType.FEE, "Frais");
            LedgerEntry e4 = LedgerEntry.create(txId, fees.getWalletId(), Direction.CREDIT, cmd.feeAmount(), feesBefore, EntryType.FEE, "Frais collectés");
            entries.add(e3);
            entries.add(e4);
            from.debit(cmd.feeAmount());
            fees.credit(cmd.feeAmount());
        }

        entryRepository.saveAll(entries);
        balanceRepository.saveAll(List.of(from, to, fees));

        TransferResult result = new TransferResult(txId, entries, from.getBalance(), to.getBalance());
        idempotencyService.store(idemKey, fingerprint(cmd), result);
        eventPublisher.publishCompleted(txId, cmd.amount(), from.getWalletId(), to.getWalletId());
        return result;
    }

    // ------------------------------------------------------------------ credit

    /** GOURSI-014c · crédit unitaire (cash-in, correction) : 1 entrée + mutation. */
    @Transactional(isolation = Isolation.SERIALIZABLE, rollbackFor = Exception.class)
    public LedgerEntryResponse credit(CreditCommand cmd) {
        String idemKey = "credit:" + cmd.idempotencyKey();
        var cached = idempotencyService.get(idemKey);
        if (cached.isPresent()) {
            return new LedgerEntryResponse(null, null, null); // replay : aucune nouvelle écriture
        }

        LedgerBalance wallet = balanceRepository.findByWalletIdForUpdate(cmd.walletId())
            .orElseThrow(() -> new WalletNotFoundException(cmd.walletId().toString()));

        LedgerEntry entry = LedgerEntry.create(cmd.transactionId(), wallet.getWalletId(), Direction.CREDIT,
            cmd.amount(), wallet.getBalance(), cmd.entryType(), cmd.description());
        wallet.credit(cmd.amount());

        entryRepository.save(entry);
        balanceRepository.save(wallet);

        idempotencyService.store(idemKey, fingerprint(cmd), new TransferResult(cmd.transactionId(), List.of(entry), wallet.getBalance(), wallet.getBalance()));
        eventPublisher.publishCompleted(cmd.transactionId(), cmd.amount(), wallet.getWalletId(), wallet.getWalletId());
        return new LedgerEntryResponse(entry.getId(), entry.getBalanceBefore(), entry.getBalanceAfter());
    }

    // ------------------------------------------------------------------ debit

    /** GOURSI-014c · débit unitaire (cash-out, correction) avec contrôle de fonds. */
    @Transactional(isolation = Isolation.SERIALIZABLE, rollbackFor = Exception.class)
    public LedgerEntryResponse debit(DebitCommand cmd) {
        String idemKey = "debit:" + cmd.idempotencyKey();
        var cached = idempotencyService.get(idemKey);
        if (cached.isPresent()) {
            return new LedgerEntryResponse(null, null, null);
        }

        LedgerBalance wallet = balanceRepository.findByWalletIdForUpdate(cmd.walletId())
            .orElseThrow(() -> new WalletNotFoundException(cmd.walletId().toString()));
        if (cmd.amount().compareTo(wallet.getAvailableBalance()) > 0) {
            throw new InsufficientFundsException(wallet.getWalletId().toString(), wallet.getAvailableBalance(), cmd.amount());
        }

        LedgerEntry entry = LedgerEntry.create(cmd.transactionId(), wallet.getWalletId(), Direction.DEBIT,
            cmd.amount(), wallet.getBalance(), cmd.entryType(), cmd.description());
        wallet.debit(cmd.amount());

        entryRepository.save(entry);
        balanceRepository.save(wallet);

        idempotencyService.store(idemKey, fingerprint(cmd), new TransferResult(cmd.transactionId(), List.of(entry), wallet.getBalance(), wallet.getBalance()));
        eventPublisher.publishCompleted(cmd.transactionId(), cmd.amount(), wallet.getWalletId(), wallet.getWalletId());
        return new LedgerEntryResponse(entry.getId(), entry.getBalanceBefore(), entry.getBalanceAfter());
    }

    // ------------------------------------------------------------------ reverse

    /**
     * GOURSI-014d · annulation : écritures miroir REVERSAL pour chaque entrée de
     * la transaction d'origine (directions inversées), soldes ajustés.
     */
    @Transactional(isolation = Isolation.SERIALIZABLE, rollbackFor = Exception.class)
    public void reverse(ReverseCommand cmd) {
        String idemKey = "reverse:" + cmd.idempotencyKey();
        if (idempotencyService.get(idemKey).isPresent()) {
            return; // déjà annulé
        }

        List<LedgerEntry> originals = entryRepository.findByTransactionId(cmd.originalTransactionId());
        if (originals.isEmpty()) {
            throw new com.goursi.ledger.domain.exception.WalletNotFoundException(
                "Aucune écriture pour la transaction " + cmd.originalTransactionId());
        }

        UUID reversalTxId = UUID.randomUUID();
        List<LedgerEntry> mirrors = new ArrayList<>();
        List<LedgerBalance> toSave = new ArrayList<>();

        for (LedgerEntry original : originals) {
            LedgerBalance wallet = balanceRepository.findByWalletIdForUpdate(original.getWalletId())
                .orElseThrow(() -> new WalletNotFoundException(original.getWalletId().toString()));

            Direction opposite = original.getDirection() == Direction.DEBIT ? Direction.CREDIT : Direction.DEBIT;
            LedgerEntry mirror = LedgerEntry.create(reversalTxId, original.getWalletId(), opposite,
                original.getAmount(), wallet.getBalance(), EntryType.REVERSAL,
                "Reversal de " + cmd.originalTransactionId() + " — " + cmd.reason());

            if (opposite == Direction.DEBIT) {
                wallet.debit(original.getAmount());
            } else {
                wallet.credit(original.getAmount());
            }
            mirrors.add(mirror);
            toSave.add(wallet);
        }

        entryRepository.saveAll(mirrors);
        balanceRepository.saveAll(toSave);
        idempotencyService.store(idemKey, fingerprint(cmd), new TransferResult(reversalTxId, mirrors, null, null));
        eventPublisher.publishReversed(cmd.originalTransactionId(), reversalTxId, cmd.reason());
    }

    // ------------------------------------------------------------------ util

    /** Empreinte canonique d'une commande (détection de conflit d'idempotence). */
    static String fingerprint(Object command) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return java.util.HexFormat.of().formatHex(md.digest(command.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
