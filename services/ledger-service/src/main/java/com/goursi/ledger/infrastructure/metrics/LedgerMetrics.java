package com.goursi.ledger.infrastructure.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import java.util.concurrent.TimeUnit;
import org.springframework.stereotype.Component;

/** Métriques Prometheus du ledger (GOURSI-LED1). */
@Component
public class LedgerMetrics {

  private final Counter transfersTotal;
  private final Counter transfersFailed;
  private final Counter reversalsTotal;
  private final Timer transferDuration;
  private final Timer creditDuration;
  private final Timer debitDuration;

  public LedgerMetrics(MeterRegistry registry) {
    this.transfersTotal = registry.counter("ledger.transfers.total");
    this.transfersFailed = registry.counter("ledger.transfers.failed");
    this.reversalsTotal = registry.counter("ledger.reversals.total");
    this.transferDuration = registry.timer("ledger.transfer.duration");
    this.creditDuration = registry.timer("ledger.credit.duration");
    this.debitDuration = registry.timer("ledger.debit.duration");
  }

  public void transferOk(long nanos) {
    transfersTotal.increment();
    transferDuration.record(nanos, TimeUnit.NANOSECONDS);
  }

  public void transferError() {
    transfersFailed.increment();
  }

  public void reversalOk() {
    reversalsTotal.increment();
  }

  public void creditOk(long nanos) {
    creditDuration.record(nanos, TimeUnit.NANOSECONDS);
  }

  public void debitOk(long nanos) {
    debitDuration.record(nanos, TimeUnit.NANOSECONDS);
  }
}
