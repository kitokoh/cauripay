package com.goursi.ledger.infrastructure.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;

/**
 * Métriques Prometheus du ledger (aucune donnée personnelle dans les labels).
 * - timer ledger_transfer_atomic_seconds
 * - counters ledger_errors_total{type=insufficient_funds|optimistic_lock|idempotency_conflict}
 */
@Component
public class LedgerMetrics {

    private final Timer transferTimer;
    private final Counter insufficientFunds;
    private final Counter optimisticLock;
    private final Counter idempotencyConflict;

    public LedgerMetrics(MeterRegistry registry) {
        this.transferTimer = Timer.builder("ledger_transfer_atomic_seconds")
                .description("Durée d'un transferAtomic")
                .register(registry);
        this.insufficientFunds = Counter.builder("ledger_errors_total")
                .tag("type", "insufficient_funds")
                .register(registry);
        this.optimisticLock = Counter.builder("ledger_errors_total")
                .tag("type", "optimistic_lock")
                .register(registry);
        this.idempotencyConflict = Counter.builder("ledger_errors_total")
                .tag("type", "idempotency_conflict")
                .register(registry);
    }

    public <T> T timeTransfer(Supplier<T> op) {
        return transferTimer.record(() -> {
            try {
                return op.get();
            } finally {
                // timer enregistre la durée même en cas d'exception
            }
        });
    }

    public void incrementInsufficientFunds() { insufficientFunds.increment(); }
    public void incrementOptimisticLock() { optimisticLock.increment(); }
    public void incrementIdempotencyConflict() { idempotencyConflict.increment(); }

    public long transferCount() {
        return transferTimer.count();
    }

    public double transferTotalSeconds() {
        return transferTimer.totalTime(TimeUnit.SECONDS);
    }
}
