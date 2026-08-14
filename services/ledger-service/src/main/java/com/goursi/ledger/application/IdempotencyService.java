package com.goursi.ledger.application;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.goursi.ledger.domain.command.CreditCommand;
import com.goursi.ledger.domain.command.DebitCommand;
import com.goursi.ledger.domain.command.TransferCommand;
import com.goursi.ledger.domain.exception.IdempotencyConflictException;
import com.goursi.ledger.domain.result.TransferResult;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;

/**
 * Déduplication des écritures financières par clé d'idempotence (Redis, TTL 24h).
 * Le payload complet (TransferResult sérialisé) est stocké — un conflit de payload
 * sur la même clé lève IdempotencyConflictException (409).
 */
@Slf4j
@Service
public class IdempotencyService {

    private static final String KEY_PREFIX = "ledger:idem:";
    private final StringRedisTemplate redis;
    private final ObjectMapper mapper;
    private final Duration ttl;

    public IdempotencyService(StringRedisTemplate redis,
                              ObjectMapper mapper,
                              @Value("${goursi.ledger.idempotency-ttl-hours:24}") int ttlHours) {
        this.redis = redis;
        this.mapper = mapper;
        this.ttl = Duration.ofHours(ttlHours);
    }

    public Optional<TransferResult> get(String idempotencyKey) {
        String raw = redis.opsForValue().get(KEY_PREFIX + idempotencyKey);
        if (raw == null) {
            return Optional.empty();
        }
        try {
            return Optional.of(mapper.readValue(raw, new TypeReference<>() {}));
        } catch (Exception e) {
            log.error("Impossible de désérialiser le résultat idempotent pour {}", idempotencyKey, e);
            return Optional.empty();
        }
    }

    public void store(String idempotencyKey, TransferResult result) {
        try {
            String raw = mapper.writeValueAsString(result);
            redis.opsForValue().set(KEY_PREFIX + idempotencyKey, raw, ttl);
        } catch (Exception e) {
            log.error("Impossible de sérialiser le résultat idempotent pour {}", idempotencyKey, e);
        }
    }

    /** Vérifie qu'une clé n'est pas déjà utilisée avec une commande différente. */
    public void assertNoConflict(String idempotencyKey, TransferCommand command) {
        get(idempotencyKey).ifPresent(existing -> {
            if (!existing.transactionId().equals(command.transactionId())) {
                throw new IdempotencyConflictException(idempotencyKey);
            }
        });
    }
}
