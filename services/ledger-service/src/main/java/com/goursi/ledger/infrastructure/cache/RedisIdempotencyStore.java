package com.goursi.ledger.infrastructure.cache;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.goursi.ledger.application.IdempotencyService;
import com.goursi.ledger.domain.model.LedgerEntry;
import com.goursi.ledger.domain.result.TransferResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * GOURSI-014a — implémentation Redis (StringRedisTemplate + JSON, TTL 24h).
 * Le résultat mémorisé permet un rejeu sans AUCUNE nouvelle écriture.
 */
@Component
public class RedisIdempotencyStore implements IdempotencyService {

    private static final Logger log = LoggerFactory.getLogger(RedisIdempotencyStore.class);
    private static final String PREFIX = "ledger:idem:";

    private final StringRedisTemplate redis;
    private final ObjectMapper mapper;
    private final Duration ttl;

    public RedisIdempotencyStore(StringRedisTemplate redis,
                                 @Value("${goursi.ledger.idempotency-ttl-hours:24}") long ttlHours) {
        this.redis = redis;
        this.ttl = Duration.ofHours(ttlHours);
        this.mapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    @Override
    public Optional<StoredResult> get(String idempotencyKey) {
        String raw = redis.opsForValue().get(PREFIX + idempotencyKey);
        if (raw == null) return Optional.empty();
        try {
            StoredJson stored = mapper.readValue(raw, StoredJson.class);
            return Optional.of(new StoredResult(stored.fingerprint(), stored.result().toDomain()));
        } catch (Exception e) {
            log.warn("Idempotency : valeur illisible pour {} — ignorée ({})", idempotencyKey, e.getMessage());
            return Optional.empty();
        }
    }

    @Override
    public void store(String idempotencyKey, String fingerprint, TransferResult result) {
        try {
            String json = mapper.writeValueAsString(new StoredJson(fingerprint, StoredJson.TransferResultJson.from(result)));
            redis.opsForValue().set(PREFIX + idempotencyKey, json, ttl);
        } catch (JsonProcessingException e) {
            // Ne jamais faire échouer une écriture financière pour un cache.
            log.error("Idempotency : sérialisation impossible pour {}", idempotencyKey, e);
        }
    }

    /** Forme JSON persistée dans Redis. */
    public record StoredJson(String fingerprint, TransferResultJson result) {

        public record TransferResultJson(UUID transactionId, List<EntryJson> entries,
                                         BigDecimal fromBalance, BigDecimal toBalance) {

            public record EntryJson(UUID id, UUID transactionId, UUID walletId, String direction,
                                    BigDecimal amount, BigDecimal balanceBefore, BigDecimal balanceAfter,
                                    String entryType, String description, Instant createdAt) {}

            public static TransferResultJson from(TransferResult r) {
                return new TransferResultJson(r.transactionId(),
                    r.entries().stream().map(e -> new EntryJson(e.getId(), e.getTransactionId(), e.getWalletId(),
                        e.getDirection().name(), e.getAmount(), e.getBalanceBefore(), e.getBalanceAfter(),
                        e.getEntryType().name(), e.getDescription(), e.getCreatedAt())).toList(),
                    r.fromBalance(), r.toBalance());
            }

            public TransferResult toDomain() {
                return new TransferResult(transactionId,
                    entries.stream().map(e -> LedgerEntry.create(e.transactionId(), e.walletId(),
                        LedgerEntry.Direction.valueOf(e.direction()), e.amount(), e.balanceBefore(),
                        LedgerEntry.EntryType.valueOf(e.entryType()), e.description())).toList(),
                    fromBalance, toBalance);
            }
        }
    }
}
