package com.goursi.ledger.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.goursi.ledger.infrastructure.cache.RedisIdempotencyStore;
import java.time.Duration;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Régression #341 : le claim d'idempotence doit utiliser un TTL COURT (30 s),
 * distinct du TTL de résultat (24 h). Un crash post-claim ne doit pas bloquer
 * la clé pendant 24 h.
 */
class IdempotencyClaimTtlTest {

  private RedisIdempotencyStore store;
  private IdempotencyService service;

  @BeforeEach
  void setUp() {
    store = mock(RedisIdempotencyStore.class);
    service = new IdempotencyService(store, new ObjectMapper(), 24);
  }

  @Test
  void claim_uses_short_ttl_not_result_ttl() {
    when(store.get("key-1")).thenReturn(Optional.empty());
    when(store.tryClaim(eq("key-1"), any(Duration.class))).thenReturn(true);

    IdempotencyService.Claim claim = service.claim("key-1", "hash-1");

    assertEquals(IdempotencyService.Claim.OK, claim);
    // Le claim utilise le TTL COURT (30 s) — jamais le TTL de résultat (24 h)
    verify(store).tryClaim(eq("key-1"), eq(IdempotencyService.CLAIM_TTL));
  }

  @Test
  void concurrent_claim_returns_in_flight() {
    when(store.get("key-2")).thenReturn(Optional.empty());
    when(store.tryClaim(anyString(), any(Duration.class))).thenReturn(false);

    IdempotencyService.Claim claim = service.claim("key-2", "hash-2");

    assertEquals(IdempotencyService.Claim.IN_FLIGHT, claim);
  }

  @Test
  void claim_ttl_is_30_seconds() {
    // Garde-fou : le TTL court reste court (aucune régression vers 24 h)
    assertEquals(Duration.ofSeconds(30), IdempotencyService.CLAIM_TTL);
  }

  @Test
  void result_keeps_long_ttl() {
    when(store.get("key-3")).thenReturn(Optional.empty());
    when(store.tryClaim(eq("key-3"), any(Duration.class))).thenReturn(true);

    service.claim("key-3", "hash-3");

    // Après succès, le résultat est stocké avec le TTL LONG (24 h)
    var result = new com.goursi.ledger.domain.result.TransferResult(
        java.util.UUID.randomUUID(), java.util.List.of(), null, null, null);
    service.storeResult("key-3", "hash-3", result);
    verify(store).save(eq("key-3"), anyString(), eq(Duration.ofHours(24)));
  }
}
