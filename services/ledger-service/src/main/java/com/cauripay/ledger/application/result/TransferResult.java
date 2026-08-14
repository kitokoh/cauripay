package com.cauripay.ledger.application.result;

import java.util.List;
import java.util.UUID;

/**
 * Résultat d'un transfer (miroir de {@code TransferResult} TS).
 * Sérialisé en JSON et stocké pour l'idempotence (Redis, TTL 24 h).
 */
public record TransferResult(
    boolean success,
    UUID transactionId,
    List<UUID> ledgerEntryIds,
    Balances balances,
    String errorCode,
    String errorMessage) {

    public record Balances(UUID from, UUID to, UUID platformFees) {
    }

    public static TransferResult completed(UUID transactionId, List<UUID> ledgerEntryIds,
                                           UUID fromWallet, UUID toWallet, UUID feesWallet) {
        return new TransferResult(true, transactionId, ledgerEntryIds,
            new Balances(fromWallet, toWallet, feesWallet), null, null);
    }

    public static TransferResult failed(UUID transactionId, String errorCode, String errorMessage) {
        return new TransferResult(false, transactionId, List.of(), null, errorCode, errorMessage);
    }
}
