package com.goursi.ledger.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.goursi.ledger.domain.exception.IdempotencyConflictException;
import com.goursi.ledger.domain.result.TransferResult;
import com.goursi.ledger.infrastructure.cache.RedisIdempotencyStore;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.HexFormat;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Idempotence des écritures financières : une clé → un résultat.
 * - Vérifiée AVANT toute écriture (dans la transaction).
 * - Claim atomique Redis (SET NX) → deux appels concurrents : un seul passe.
 * - Résultat stocké après succès (jamais de poison d'une transaction annulée).
 */
@Service
public class IdempotencyService {

  /** TTL court du claim (en cours de traitement) — distinct du TTL de résultat. */
  static final Duration CLAIM_TTL = Duration.ofSeconds(30);

  private final RedisIdempotencyStore store;
  private final ObjectMapper objectMapper;
  private final Duration ttl;

  public IdempotencyService(
      RedisIdempotencyStore store,
      ObjectMapper objectMapper,
      @Value("${goursi.ledger.idempotency-ttl-hours:24}") long ttlHours) {
    this.store = store;
    this.objectMapper = objectMapper;
    this.ttl = Duration.ofHours(ttlHours);
  }

  public enum Claim {
    /** Clé libre : l'appelant peut écrire. */
    OK,
    /** Clé en cours de traitement par un autre appel. */
    IN_FLIGHT,
    /** Clé déjà consommée par une commande différente. */
    CONFLICT
  }

  /** Hash canonique d'une clé (SHA-256). */
  public String hash(String canonicalCommand) {
    try {
      MessageDigest md = MessageDigest.getInstance("SHA-256");
      return HexFormat.of().formatHex(md.digest(canonicalCommand.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
    } catch (Exception e) {
      throw new IllegalStateException("SHA-256 indisponible", e);
    }
  }

  /** Réclame la clé pour une commande. */
  public Claim claim(String idempotencyKey, String commandHash) {
    Optional<String> existing = store.get(idempotencyKey);
    if (existing.isPresent()) {
      String value = existing.get();
      if (value.startsWith("RESULT:")) {
        return value.contains(":" + commandHash + ":") ? Claim.OK : Claim.CONFLICT;
      }
      return Claim.IN_FLIGHT; // CLAIMED par un autre appel en cours
    }
    // TTL COURT (30 s) : si le process meurt après le claim mais avant le commit,
    // la clé se libère après 30 s — un retry légitime redevient possible.
    // (Le résultat final, lui, garde le TTL long : 24 h.)
    return store.tryClaim(idempotencyKey, CLAIM_TTL) ? Claim.OK : Claim.IN_FLIGHT;
  }

  /** Résultat en cache (appel rejoué). */
  public Optional<TransferResult> getCached(String idempotencyKey, String commandHash) {
    Optional<String> existing = store.get(idempotencyKey);
    if (existing.isEmpty() || !existing.get().startsWith("RESULT:")) {
      return Optional.empty();
    }
    String value = existing.get();
    if (!value.contains(":" + commandHash + ":")) {
      throw new IdempotencyConflictException(idempotencyKey);
    }
    String json = value.substring(value.indexOf("\n") + 1);
    try {
      return Optional.of(objectMapper.readValue(json, TransferResult.class));
    } catch (Exception e) {
      throw new IllegalStateException("Résultat d'idempotence illisible pour " + idempotencyKey, e);
    }
  }

  /** Stocke le résultat final (écrase le claim). */
  public void storeResult(String idempotencyKey, String commandHash, TransferResult result) {
    try {
      String json = objectMapper.writeValueAsString(result);
      store.save(idempotencyKey, "RESULT:" + commandHash + ":" + "\n" + json, ttl);
    } catch (Exception e) {
      throw new IllegalStateException("Sérialisation du résultat d'idempotence impossible", e);
    }
  }

  public void release(String idempotencyKey) {
    store.delete(idempotencyKey);
  }
}
