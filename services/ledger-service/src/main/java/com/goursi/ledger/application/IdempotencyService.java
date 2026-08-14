package com.goursi.ledger.application;

import com.goursi.ledger.domain.result.TransferResult;

import java.util.Optional;

/**
 * GOURSI-014a — déduplication de toute écriture financière par clé
 * d'idempotence (Redis, TTL 24h). Vérifiée AVANT toute écriture, dans la
 * même transaction.
 */
public interface IdempotencyService {

    /** Payload mémorisé pour une clé (vide si jamais utilisée). */
    Optional<StoredResult> get(String idempotencyKey);

    void store(String idempotencyKey, String fingerprint, TransferResult result);

    record StoredResult(String fingerprint, TransferResult result) {}
}
