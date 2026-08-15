package com.goursi.ledger.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.goursi.ledger.domain.result.TransferResult;
import com.goursi.ledger.infrastructure.cache.RedisIdempotencyStore;
import java.math.BigDecimal;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * TTL court du claim d'idempotence (issue #341) : un crash après le claim (avant commit)
 * ne doit pas bloquer la clé pendant 24 h — elle redevient libre après le TTL du claim.
 * Le résultat, lui, garde le TTL long (24 h) pour les rejeux.
 */
@Testcontainers
class IdempotencyClaimTtlTest {

  @Container
  static final GenericContainer<?> REDIS = new GenericContainer<>("redis:7-alpine")
      .withExposedPorts(6379);

  private RedisIdempotencyStore store;
  private IdempotencyService service;

  @BeforeEach
  void setup() {
    RedisStandaloneConfiguration conf =
        new RedisStandaloneConfiguration(REDIS.getHost(), REDIS.getMappedPort(6379));
    LettuceConnectionFactory factory = new LettuceConnectionFactory(conf);
    factory.afterPropertiesSet();
    StringRedisTemplate redis = new StringRedisTemplate(factory);
    redis.afterPropertiesSet();

    store = new RedisIdempotencyStore(redis);
    service = new IdempotencyService(store, new ObjectMapper(), 24);
  }

  @Test
  void claim_expire_apres_crash_simule() {
    String key = UUID.randomUUID().toString();
    String hash = service.hash("command-canonical");

    // 1. Un process gagne le claim, puis "meurt" (jamais de storeResult)
    assertThat(service.claim(key, hash)).isEqualTo(IdempotencyService.Claim.OK);

    // 2. Le claim est posé avec un TTL COURT (30 s), pas le TTL résultat (24 h)
    Long claimTtl = store.getTtlSeconds(key);
    assertThat(claimTtl).isLessThan(Duration.ofMinutes(5).toSeconds());

    // 3. Pendant le "crash", un concurrent reçoit IN_FLIGHT (pas de double écriture)
    assertThat(service.claim(key, hash)).isEqualTo(IdempotencyService.Claim.IN_FLIGHT);

    // 4. Après expiration du claim (simulée), la clé redevient libre
    store.delete(key);
    assertThat(service.claim(key, hash)).isEqualTo(IdempotencyService.Claim.OK);
  }

  @Test
  void result_garde_le_ttl_long() throws Exception {
    String key = UUID.randomUUID().toString();
    String hash = service.hash("command-canonical");
    assertThat(service.claim(key, hash)).isEqualTo(IdempotencyService.Claim.OK);

    TransferResult result = new TransferResult(
        UUID.randomUUID(), List.of(), BigDecimal.ONE, BigDecimal.ONE, BigDecimal.ZERO);
    service.storeResult(key, hash, result);

    // Le résultat est rejouable (getCached) avec un TTL long (24 h)
    assertThat(service.getCached(key, hash)).isPresent();
    Long resultTtl = store.getTtlSeconds(key);
    assertThat(resultTtl).isGreaterThan(Duration.ofHours(23).toSeconds());
  }
}
