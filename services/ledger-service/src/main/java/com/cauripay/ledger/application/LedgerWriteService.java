package com.cauripay.ledger.application;

import com.cauripay.ledger.application.command.CreditCommand;
import com.cauripay.ledger.application.command.DebitCommand;
import com.cauripay.ledger.application.command.ReverseCommand;
import com.cauripay.ledger.application.command.TransferCommand;
import com.cauripay.ledger.application.result.TransferResult;
import com.cauripay.ledger.metrics.LedgerMetrics;
import org.springframework.dao.ConcurrencyFailureException;
import org.springframework.stereotype.Service;

import java.util.function.Supplier;

/**
 * Façade d'écriture : idempotence (Redis) + retry sur conflits de concurrence.
 *
 * <p>Le vrai travail transactionnel est dans {@link LedgerWriteTx} (proxy Spring).
 * Le retry couvre les échecs d'isolation SERIALIZABLE / verrou optimiste
 * (concurrence entre threads — DoD #2) : {@code ConcurrencyFailureException}
 * englobe à la fois {@code OptimisticLockingFailureException} et
 * {@code CannotSerializeTransactionException}.
 */
@Service
public class LedgerWriteService {

    private static final int MAX_RETRIES = 12;
    private static final java.util.Random JITTER = new java.util.Random();

    private final LedgerWriteTx writeTx;
    private final IdempotencyService idempotencyService;
    private final LedgerMetrics metrics;

    public LedgerWriteService(
        LedgerWriteTx writeTx,
        IdempotencyService idempotencyService,
        LedgerMetrics metrics) {
        this.writeTx = writeTx;
        this.idempotencyService = idempotencyService;
        this.metrics = metrics;
    }

    public TransferResult transfer(TransferCommand command) {
        return idempotencyService.executeIdempotently(command.idempotencyKey(),
            () -> withRetry(() -> writeTx.transferAtomic(command)));
    }

    public TransferResult credit(CreditCommand command) {
        return idempotencyService.executeIdempotently(command.idempotencyKey(),
            () -> withRetry(() -> writeTx.credit(command)));
    }

    public TransferResult debit(DebitCommand command) {
        return idempotencyService.executeIdempotently(command.idempotencyKey(),
            () -> withRetry(() -> writeTx.debit(command)));
    }

    public TransferResult reverse(ReverseCommand command) {
        return idempotencyService.executeIdempotently(command.idempotencyKey(),
            () -> withRetry(() -> writeTx.reverse(command)));
    }

    /**
     * Relit les soldes et réessaie en cas de conflit de concurrence
     * (verrou optimiste / échec de sérialisation), avec backoff court.
     */
    private TransferResult withRetry(Supplier<TransferResult> action) {
        ConcurrencyFailureException last = null;
        for (int attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                return action.get();
            } catch (ConcurrencyFailureException e) {
                last = e;
                metrics.error("concurrency");
                if (attempt < MAX_RETRIES - 1) {
                    try {
                        // backoff exponentiel + jitter : désynchronise les threads
                        // concurrents (évite le livelock SERIALIZABLE)
                        final long backoff = 25L * (1L << Math.min(attempt, 4)) + JITTER.nextInt(50);
                        Thread.sleep(backoff);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            }
        }
        throw last;
    }
}
