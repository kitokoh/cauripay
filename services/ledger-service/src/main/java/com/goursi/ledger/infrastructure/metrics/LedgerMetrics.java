package com.goursi.ledger.infrastructure.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.stereotype.Component;

import java.time.Duration;

/** GOURSI-LED1 — observabilité du cœur comptable (latence + compteurs d'erreurs). */
@Component
public class LedgerMetrics {

    private final Timer transferAtomicTimer;
    private final Counter insufficientFunds;
    private final Counter optimisticLock;
    private final Counter idempotencyConflict;

    public LedgerMetrics(MeterRegistry registry) {
        this.transferAtomicTimer = Timer.builder("ledger.transfer_atomic")
            .description("Durée d'un transferAtomique (SERIALIZABLE)")
            .publishPercentiles(0.5, 0.95, 0.99)
            .register(registry);
        this.insufficientFunds = Counter.builder("ledger.errors")
            .tag("type", "insufficient_funds").register(registry);
        this.optimisticLock = Counter.builder("ledger.errors")
            .tag("type", "optimistic_lock").register(registry);
        this.idempotencyConflict = Counter.builder("ledger.errors")
            .tag("type", "idempotency_conflict").register(registry);
    }

    public Timer.Sample startTransfer() {
        return Timer.start();
    }

    public void stopTransfer(Timer.Sample sample) {
        sample.stop(transferAtomicTimer);
    }

    public void error(String type) {
        switch (type) {
            case "insufficient_funds" -> insufficientFunds.increment();
            case "optimistic_lock" -> optimisticLock.increment();
            case "idempotency_conflict" -> idempotencyConflict.increment();
            default -> { /* inconnu */ }
        }
    }
}
