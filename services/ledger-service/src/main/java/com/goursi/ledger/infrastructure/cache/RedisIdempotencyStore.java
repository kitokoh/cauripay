package com.goursi.ledger.infrastructure.cache;

import java.time.Duration;
import java.util.Optional;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * Stockage d'idempotence Redis (TTL configurable, défaut 24 h).
 * Claim atomique (SET NX) → deux appels concurrents avec la même clé :
 * un seul gagne, l'autre reçoit un conflit retentable.
 */
@Component
public class RedisIdempotencyStore {

  private static final String KEY_PREFIX = "ledger:idem:";

  private final StringRedisTemplate redis;

  public RedisIdempotencyStore(StringRedisTemplate redis) {
    this.redis = redis;
  }

  private String key(String idempotencyKey) {
    return KEY_PREFIX + idempotencyKey;
  }

  /** Réclame la clé (SET NX). Retourne false si déjà réclamée. */
  public boolean tryClaim(String idempotencyKey, Duration ttl) {
    Boolean ok = redis.opsForValue().setIfAbsent(key(idempotencyKey), "CLAIMED", ttl);
    return Boolean.TRUE.equals(ok);
  }

  /** Lit la valeur (claim ou résultat). */
  public Optional<String> get(String idempotencyKey) {
    return Optional.ofNullable(redis.opsForValue().get(key(idempotencyKey)));
  }

  /** Enregistre le résultat final (écrase le claim). */
  public void save(String idempotencyKey, String json, Duration ttl) {
    redis.opsForValue().set(key(idempotencyKey), json, ttl);
  }

  public void delete(String idempotencyKey) {
    redis.delete(key(idempotencyKey));
  }

  /** TTL restant de la clé en secondes (assertions de test). */
  public Long getTtlSeconds(String idempotencyKey) {
    return redis.getExpire(key(idempotencyKey), java.util.concurrent.TimeUnit.SECONDS);
  }
}
