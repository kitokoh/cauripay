package com.cauripay.ledger.application;

import com.cauripay.ledger.application.result.TransferResult;
import com.cauripay.ledger.common.ConflictException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;
import java.util.function.Supplier;

/**
 * Idempotence des opérations d'écriture (GOURSI-014a).
 *
 * <p>Garanties :
 * <ul>
 *   <li>rejeu : une même clé renvoie le même résultat (sans double écriture) ;</li>
 *   <li>concurrence : deux appels simultanés avec la même clé → un seul traitement,
 *       l'autre attend et reçoit le résultat du premier ;</li>
 *   <li>échec : la clé est libérée (aucune trace), un retry est possible.</li>
 * </ul>
 */
@Service
public class IdempotencyService {

    private static final Logger LOG = LoggerFactory.getLogger(IdempotencyService.class);
    private static final int MAX_CLAIM_ATTEMPTS = 3;

    private final IdempotencyStore store;
    private final ObjectMapper objectMapper;
    private final Duration resultTtl;
    private final Duration claimTtl;

    public IdempotencyService(
        IdempotencyStore store,
        ObjectMapper objectMapper,
        @Value("${ledger.idempotency.ttl-hours:24}") long ttlHours,
        @Value("${ledger.idempotency.claim-ttl-seconds:30}") long claimTtlSeconds) {
        this.store = store;
        this.objectMapper = objectMapper;
        this.resultTtl = Duration.ofHours(ttlHours);
        this.claimTtl = Duration.ofSeconds(claimTtlSeconds);
    }

    /**
     * Exécute {@code action} de façon idempotente pour la clé donnée.
     *
     * <p>Le résultat n'est stocké qu'après commit (hook {@code afterCommit} de la
     * transaction, cf. {@code LedgerWriteTx}) : un échec ne laisse aucune trace.
     */
    public TransferResult executeIdempotently(String idempotencyKey, Supplier<TransferResult> action) {
        // 1. déjà traité ?
        final Optional<TransferResult> replay = replay(idempotencyKey);
        if (replay.isPresent()) {
            return replay.get();
        }

        // 2. réserver la clé (avec retry si un concurrent la traite)
        for (int attempt = 0; attempt < MAX_CLAIM_ATTEMPTS; attempt++) {
            if (store.claim(idempotencyKey, claimTtl)) {
                try {
                    return action.get();
                } catch (RuntimeException e) {
                    store.release(idempotencyKey);
                    throw e;
                }
            }
            final Optional<TransferResult> concurrent = awaitConcurrentResult(idempotencyKey);
            if (concurrent.isPresent()) {
                return concurrent.get();
            }
        }
        throw new ConflictException(
            "Traitement concurrent de la clé d'idempotence " + idempotencyKey + " : réessayez.");
    }

    /** Stocke le résultat final (appelé en afterCommit par le service d'écriture). */
    public void complete(String idempotencyKey, TransferResult result) {
        try {
            store.storeResult(idempotencyKey, objectMapper.writeValueAsString(result), resultTtl);
        } catch (JsonProcessingException e) {
            LOG.error("Sérialisation impossible du résultat idempotent pour {}", idempotencyKey, e);
        }
    }

    private Optional<TransferResult> replay(String key) {
        return store.get(key)
            .filter(value -> !IdempotencyStore.CLAIM_MARKER.equals(value))
            .map(this::parse);
    }

    private Optional<TransferResult> awaitConcurrentResult(String key) {
        final long deadline = System.currentTimeMillis() + claimTtl.toMillis();
        while (System.currentTimeMillis() < deadline) {
            final Optional<String> value = store.get(key);
            if (value.isEmpty()) {
                // le concurrent a échoué et libéré la clé → retenter le claim
                return Optional.empty();
            }
            if (!IdempotencyStore.CLAIM_MARKER.equals(value.get())) {
                return Optional.of(parse(value.get()));
            }
            try {
                Thread.sleep(100);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new ConflictException("Interruption pendant l'attente d'idempotence.");
            }
        }
        return Optional.empty();
    }

    private TransferResult parse(String json) {
        try {
            final TransferResult result = objectMapper.readValue(json, TransferResult.class);
            if (result.transactionId() == null) {
                throw new ConflictException("Résultat idempotent invalide.");
            }
            return result;
        } catch (JsonProcessingException e) {
            LOG.error("Résultat idempotent illisible — conflit");
            throw ConflictException.idempotency("inconnue");
        }
    }
}
