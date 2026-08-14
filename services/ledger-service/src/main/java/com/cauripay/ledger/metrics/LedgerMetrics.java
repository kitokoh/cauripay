package com.cauripay.ledger.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Métriques Prometheus du ledger (GOURSI-LED1) :
 * <ul>
 *   <li>{@code ledger_transfer_duration_seconds} — latence d'un transfer ;</li>
 *   <li>{@code ledger_transfer_total{outcome}} — compteur succès/erreur/rejeu ;</li>
 *   <li>{@code ledger_errors_total{type}} — compteur d'erreurs par type.</li>
 * </ul>
 */
@Component
public class LedgerMetrics {

    private final MeterRegistry registry;
    private final Counter successCounter;
    private final Counter errorCounter;
    private final Counter replayCounter;

    public LedgerMetrics(MeterRegistry registry) {
        this.registry = registry;
        this.successCounter = registry.counter("ledger_transfer_total", "outcome", "success");
        this.errorCounter = registry.counter("ledger_transfer_total", "outcome", "error");
        this.replayCounter = registry.counter("ledger_transfer_total", "outcome", "replay");
    }

    public Timer.Sample startTransfer() {
        return Timer.start(registry);
    }

    public void finishTransfer(Timer.Sample sample, String outcome) {
        final Timer timer = Timer.builder("ledger_transfer_duration_seconds")
            .description("Durée d'un transfer ledger")
            .tag("outcome", outcome)
            .register(registry);
        sample.stop(timer);
    }

    public void transfer(String status) {
        if ("reversed".equals(status)) {
            // les reversals restent des succès comptables
            successCounter.increment();
        } else if ("completed".equals(status)) {
            successCounter.increment();
        } else {
            errorCounter.increment();
        }
    }

    public void replay() {
        replayCounter.increment();
    }

    public void error(String type) {
        registry.counter("ledger_errors_total", "type", type).increment();
    }

    /** Durée maximale de référence (p95 < 2 s — DoD #7). */
    public static Duration referenceLatency() {
        return Duration.ofSeconds(2);
    }
}
