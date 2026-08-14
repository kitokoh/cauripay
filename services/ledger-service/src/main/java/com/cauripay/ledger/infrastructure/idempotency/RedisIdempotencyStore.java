package com.cauripay.ledger.infrastructure.idempotency;

import com.cauripay.ledger.application.IdempotencyStore;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Repository;

import java.time.Duration;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

/**
 * Implémentation Redis de l'idempotence (GOURSI-014a) — TTL 24 h.
 */
@Repository
public class RedisIdempotencyStore implements IdempotencyStore {

    private final StringRedisTemplate redis;

    public RedisIdempotencyStore(StringRedisTemplate redis) {
        this.redis = redis;
    }

    @Override
    public boolean claim(String key, Duration ttl) {
        final Boolean set = redis.opsForValue().setIfAbsent(key, CLAIM_MARKER, ttl);
        return Boolean.TRUE.equals(set);
    }

    @Override
    public Optional<String> get(String key) {
        return Optional.ofNullable(redis.opsForValue().get(key));
    }

    @Override
    public void storeResult(String key, String resultJson, Duration ttl) {
        redis.opsForValue().set(key, resultJson, ttl.toSeconds(), TimeUnit.SECONDS);
    }

    @Override
    public void release(String key) {
        redis.delete(key);
    }
}
