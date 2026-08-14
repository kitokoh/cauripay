package com.cauripay.ledger.application;

import com.cauripay.ledger.application.result.TransferResult;
import com.cauripay.ledger.common.ConflictException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Tests unitaires de l'idempotence (GOURSI-014a) avec un store en mémoire.
 */
class IdempotencyServiceTest {

    private static final class FakeStore implements IdempotencyStore {

        final Map<String, String> values = new ConcurrentHashMap<>();

        @Override
        public boolean claim(String key, Duration ttl) {
            return values.putIfAbsent(key, CLAIM_MARKER) == null;
        }

        @Override
        public Optional<String> get(String key) {
            return Optional.ofNullable(values.get(key));
        }

        @Override
        public void storeResult(String key, String resultJson, Duration ttl) {
            values.put(key, resultJson);
        }

        @Override
        public void release(String key) {
            values.remove(key);
        }
    }

    private FakeStore store;
    private IdempotencyService service;

    @BeforeEach
    void setUp() {
        store = new FakeStore();
        service = new IdempotencyService(store, new ObjectMapper(), 24, 1);
    }

    private static TransferResult ok(UUID transactionId) {
        return TransferResult.completed(transactionId, java.util.List.of(), UUID.randomUUID(),
            UUID.randomUUID(), null);
    }

    @Test
    void executesOnceAndStoresResult() {
        final UUID transactionId = UUID.randomUUID();
        final AtomicInteger calls = new AtomicInteger();

        final Supplier<TransferResult> action = () -> {
            calls.incrementAndGet();
            final TransferResult result = ok(transactionId);
            service.complete("key-1", result); // comme le ferait le hook afterCommit
            return result;
        };

        final TransferResult first = service.executeIdempotently("key-1", action);
        final TransferResult second = service.executeIdempotently("key-1", action);

        assertThat(first.transactionId()).isEqualTo(transactionId);
        assertThat(second.transactionId()).isEqualTo(transactionId);
        assertThat(calls.get()).isEqualTo(1); // action exécutée une seule fois
    }

    @Test
    void releasesKeyOnFailure() {
        assertThatThrownBy(() -> service.executeIdempotently("key-2", () -> {
            throw new IllegalStateException("boom");
        })).isInstanceOf(IllegalStateException.class);

        assertThat(store.get("key-2")).isEmpty(); // clé libérée → retry possible
    }

    @Test
    void waitsForConcurrentResultAndReturnsIt() {
        final UUID transactionId = UUID.randomUUID();

        // Premier appelant : claim puis "travail" (on simule le résultat stocké après commit)
        final TransferResult result = ok(transactionId);
        final Thread first = new Thread(() -> {
            service.executeIdempotently("key-3", () -> {
                service.complete("key-3", result); // simulé en afterCommit
                return result;
            });
        });

        final AtomicInteger secondCalls = new AtomicInteger();
        first.start();
        try {
            Thread.sleep(50); // laisse le premier claim la clé
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        final TransferResult concurrent = service.executeIdempotently("key-3", () -> {
            secondCalls.incrementAndGet();
            return ok(UUID.randomUUID());
        });

        assertThat(concurrent.transactionId()).isEqualTo(transactionId);
        assertThat(secondCalls.get()).isZero(); // le second appelant n'a PAS exécuté l'action
    }

    @Test
    void throwsConflictWhenClaimNeverResolves() {
        // claim posé par un tiers qui ne répond jamais (simulé)
        store.values.put("key-4", IdempotencyStore.CLAIM_MARKER);
        assertThatThrownBy(() -> service.executeIdempotently("key-4", () -> ok(UUID.randomUUID())))
            .isInstanceOf(ConflictException.class);
    }
}
