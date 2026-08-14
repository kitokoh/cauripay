package com.cauripay.ledger.application;

import java.time.Duration;
import java.util.Optional;

/**
 * Stockage d'idempotence (GOURSI-014a). Implémentation Redis : {@code RedisIdempotencyStore}.
 *
 * <p>Contrat : une clé passe par trois états —
 * <ol>
 *   <li>absente (jamais vue),</li>
 *   <li>{@code CLAIM} (une commande est en cours de traitement — claim TTL court),</li>
 *   <li>résultat JSON (commande terminée — TTL 24 h).</li>
 * </ol>
 */
public interface IdempotencyStore {

    /** Valeur de la clé pendant le traitement d'une commande. */
    String CLAIM_MARKER = "CLAIM";

    /**
     * Réserve la clé (SET NX) si elle est absente ou expirée.
     *
     * @return true si la réservation a réussi (cette instance est le processeur).
     */
    boolean claim(String key, Duration ttl);

    /** Valeur courante de la clé (CLAIM_MARKER ou JSON de résultat). */
    Optional<String> get(String key);

    /** Enregistre le résultat final (TTL long, écrase le marqueur CLAIM). */
    void storeResult(String key, String resultJson, Duration ttl);

    /** Libère la clé (échec de la commande — permet un retry). */
    void release(String key);
}
