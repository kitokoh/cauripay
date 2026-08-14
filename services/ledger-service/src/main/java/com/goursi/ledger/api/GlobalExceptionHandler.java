package com.goursi.ledger.api;

import com.goursi.ledger.api.dto.ErrorResponse;
import com.goursi.ledger.domain.exception.IdempotencyConflictException;
import com.goursi.ledger.domain.exception.InsufficientFundsException;
import com.goursi.ledger.domain.exception.WalletNotFoundException;
import com.goursi.ledger.infrastructure.metrics.LedgerMetrics;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;
import java.util.stream.Collectors;

/**
 * GOURSI-010c — statuts cohérents : 404 wallet inconnu · 409 conflit
 * idempotence / verrou optimiste · 422 validation / solde insuffisant.
 * Log complet systématique (jamais d'exception avalée).
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    private final LedgerMetrics metrics;

    public GlobalExceptionHandler(LedgerMetrics metrics) {
        this.metrics = metrics;
    }

    @ExceptionHandler(WalletNotFoundException.class)
    public ResponseEntity<ErrorResponse> walletNotFound(WalletNotFoundException e) {
        log.warn("WalletNotFound: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(ErrorResponse.of("WALLET_NOT_FOUND", e.getMessage(), Map.of("walletId", e.getWalletId())));
    }

    @ExceptionHandler(IdempotencyConflictException.class)
    public ResponseEntity<ErrorResponse> idempotencyConflict(IdempotencyConflictException e) {
        metrics.error("idempotency_conflict");
        log.warn("IdempotencyConflict: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(ErrorResponse.of("IDEMPOTENCY_CONFLICT", e.getMessage()));
    }

    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    public ResponseEntity<ErrorResponse> optimisticLock(ObjectOptimisticLockingFailureException e) {
        metrics.error("optimistic_lock");
        log.warn("OptimisticLock (retentable): {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(ErrorResponse.of("OPTIMISTIC_LOCK", "Conflit de concurrence — réessayez.", null));
    }

    /** Échec de sérialisation PG (SQLState 40001) : normal sous concurrence, retentable → 409. */
    @ExceptionHandler(org.springframework.dao.PessimisticLockingFailureException.class)
    public ResponseEntity<ErrorResponse> serializationFailure(org.springframework.dao.PessimisticLockingFailureException e) {
        metrics.error("optimistic_lock");
        log.warn("Serialisation/concurrence (retentable): {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(ErrorResponse.of("OPTIMISTIC_LOCK", "Conflit de concurrence — réessayez.", null));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> dataIntegrity(DataIntegrityViolationException e) {
        log.warn("DataIntegrityViolation: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(ErrorResponse.of("DATA_CONSTRAINT", "Contrainte d'intégrité violée.", null));
    }

    @ExceptionHandler(InsufficientFundsException.class)
    public ResponseEntity<ErrorResponse> insufficientFunds(InsufficientFundsException e) {
        metrics.error("insufficient_funds");
        log.warn("InsufficientFunds: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
            .body(ErrorResponse.of("INSUFFICIENT_FUNDS", "Solde insuffisant",
                Map.of("walletId", e.getWalletId(), "available", e.getBalance(), "requested", e.getRequested())));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> validation(MethodArgumentNotValidException e) {
        Map<String, String> details = e.getBindingResult().getFieldErrors().stream()
            .collect(Collectors.toMap(f -> f.getField(), f -> f.getDefaultMessage() == null ? "invalide" : f.getDefaultMessage(),
                (a, b) -> a));
        log.warn("Validation: {}", details);
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
            .body(ErrorResponse.of("VALIDATION_ERROR", "Payload invalide.", details));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> illegalArgument(IllegalArgumentException e) {
        log.warn("IllegalArgument: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
            .body(ErrorResponse.of("VALIDATION_ERROR", e.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> generic(Exception e) {
        log.error("Erreur interne", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ErrorResponse.of("INTERNAL_ERROR", "Erreur interne du ledger."));
    }
}
