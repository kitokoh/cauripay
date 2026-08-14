package com.cauripay.ledger.domain;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Fabrique des écritures comptables — seul point de création des
 * {@link LedgerEntry} (l'entité est immuable et son constructeur est privé).
 */
public final class LedgerEntryFactory {

    private LedgerEntryFactory() {
    }

    /**
     * Crée les 4 écritures d'un transfer atomique (GOURSI-014b) :
     * débit principal (émetteur), crédit principal (bénéficiaire),
     * débit frais (émetteur), crédit frais collectés (wallet plateforme).
     *
     * @param feeAmount      montant des frais (0 ou null si aucun frais)
     * @param feesWalletId   wallet plateforme qui encaisse les frais
     */
    public static List<LedgerEntry> transferEntries(
        UUID transactionId,
        LedgerBalance from,
        LedgerBalance to,
        LedgerBalance feesWallet,
        BigDecimal principal,
        BigDecimal feeAmount,
        String description) {

        final Instant now = Instant.now();
        final List<LedgerEntry> entries = new ArrayList<>(4);
        final BigDecimal fee = (feeAmount == null) ? BigDecimal.ZERO.setScale(2) : feeAmount;

        // 1. Débit principal sur l'émetteur
        entries.add(entry(transactionId, from.walletId(), LedgerDirection.DEBIT, principal,
            from.balance(), from.balance().subtract(principal), EntryType.PRINCIPAL,
            description, now));
        from.debit(principal);

        // 2. Crédit principal sur le bénéficiaire
        entries.add(entry(transactionId, to.walletId(), LedgerDirection.CREDIT, principal,
            to.balance(), to.balance().add(principal), EntryType.PRINCIPAL,
            description, now));
        to.credit(principal);

        // 3-4. Frais : débit émetteur → crédit wallet plateforme
        if (fee.signum() > 0 && feesWallet != null) {
            entries.add(entry(transactionId, from.walletId(), LedgerDirection.DEBIT, fee,
                from.balance(), from.balance().subtract(fee), EntryType.FEE,
                "Frais " + description, now));
            from.debit(fee);

            entries.add(entry(transactionId, feesWallet.walletId(), LedgerDirection.CREDIT, fee,
                feesWallet.balance(), feesWallet.balance().add(fee), EntryType.FEE,
                "Frais collectés " + description, now));
            feesWallet.credit(fee);
        }

        return entries;
    }

    /** Écriture miroir de reversal (GOURSI-014d) : directions inversées. */
    public static List<LedgerEntry> reversalEntries(
        UUID reversalTransactionId,
        List<LedgerEntry> originalEntries,
        LedgerEntryFetcher fetcher) {

        final Instant now = Instant.now();
        // Les écritures sont fournies dans l'ordre d'origine ; on les inverse.
        final List<LedgerEntry> reversals = new ArrayList<>(originalEntries.size());
        for (int i = originalEntries.size() - 1; i >= 0; i--) {
            final LedgerEntry original = originalEntries.get(i);
            final LedgerBalance balance = fetcher.fetch(original.walletId());
            final LedgerDirection mirror = original.direction() == LedgerDirection.DEBIT
                ? LedgerDirection.CREDIT
                : LedgerDirection.DEBIT;
            final BigDecimal balanceAfter = mirror == LedgerDirection.DEBIT
                ? balance.balance().subtract(original.amount())
                : balance.balance().add(original.amount());
            reversals.add(new LedgerEntry(
                UUID.randomUUID(),
                reversalTransactionId,
                original.walletId(),
                mirror,
                original.amount(),
                balance.balance(),
                balanceAfter,
                EntryType.REVERSAL,
                "Reversal de " + original.transactionId(),
                now));
            if (mirror == LedgerDirection.DEBIT) {
                balance.debit(original.amount());
            } else {
                balance.credit(original.amount());
            }
        }
        return reversals;
    }

    /** Écriture simple (credit / debit unitaire) — applique aussi la mutation du solde. */
    public static LedgerEntry singleEntry(
        UUID transactionId,
        LedgerBalance balance,
        LedgerDirection direction,
        BigDecimal amount,
        EntryType type,
        String description) {

        final BigDecimal after = direction == LedgerDirection.DEBIT
            ? balance.balance().subtract(amount)
            : balance.balance().add(amount);
        final LedgerEntry entry = entry(transactionId, balance.walletId(), direction, amount,
            balance.balance(), after, type, description, Instant.now());
        if (direction == LedgerDirection.DEBIT) {
            balance.debit(amount);
        } else {
            balance.credit(amount);
        }
        return entry;
    }

    private static LedgerEntry entry(
        UUID transactionId,
        UUID walletId,
        LedgerDirection direction,
        BigDecimal amount,
        BigDecimal before,
        BigDecimal after,
        EntryType type,
        String description,
        Instant createdAt) {
        return new LedgerEntry(
            UUID.randomUUID(),
            transactionId,
            walletId,
            direction,
            amount,
            before,
            after,
            type,
            description,
            createdAt);
    }

    /** Accès au solde d'un wallet (utilisé par {@link #reversalEntries}). */
    @FunctionalInterface
    public interface LedgerEntryFetcher {
        LedgerBalance fetch(UUID walletId);
    }
}
