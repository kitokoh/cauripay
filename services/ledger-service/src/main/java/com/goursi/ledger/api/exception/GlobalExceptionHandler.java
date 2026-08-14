package com.goursi.ledger.api.exception;

import com.goursi.ledger.domain.exception.IdempotencyConflictException;
import com.goursi.ledger.domain.exception.InsufficientFundsException;
import com.goursi.ledger.domain.exception.WalletNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * Enveloppe d'erreur stable : { success: false, error: { code, message, details } }.
 * Statuts : 404 wallet inconnu · 409 conflit idempotence/optimistic lock · 422 validation/solde.
 * Jamais d'exception avalée : la stacktrace complète est loggée.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    private record ErrorBody(boolean success, Error error, String timestamp, String requestId) {
        private record Error(String code, String message, Object details) {}
    }

    private static final String REQUEST_ID = UUID.randomUUID().toString();

    @ExceptionHandler(WalletNotFoundException.class)
    public ResponseEntity<ErrorBody> walletNotFound(WalletNotFoundException ex) {
        log.error("Wallet inconnu", ex);
        return build(HttpStatus.NOT_FOUND, "WALLET_NOT_FOUND", ex.getMessage());
    }

    @ExceptionHandler(IdempotencyConflictException.class)
    public ResponseEntity<ErrorBody> idempotencyConflict(IdempotencyConflictException ex) {
        log.error("Conflit d'idempotence", ex);
        return build(HttpStatus.CONFLICT, "IDEMPOTENCY_CONFLICT", ex.getMessage());
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    public ResponseEntity<ErrorBody> optimisticLock(OptimisticLockingFailureException ex) {
        log.error("Conflit de concurrence (optimistic lock)", ex);
        return build(HttpStatus.CONFLICT, "OPTIMISTIC_LOCK", "Conflit de concurrence, réessayez");
    }

    @ExceptionHandler(InsufficientFundsException.class)
    public ResponseEntity<ErrorBody> insufficientFunds(InsufficientFundsException ex) {
        log.error("Solde insuffisant", ex);
        return build(HttpStatus.UNPROCESSABLE_ENTITY, "INSUFFICIENT_FUNDS", ex.getMessage());
    }

    @ExceptionHandler({IllegalArgumentException.class, MethodArgumentNotValidException.class})
    public ResponseEntity<ErrorBody> badRequest(Exception ex) {
        log.error("Requête invalide", ex);
        return build(HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION_ERROR", ex.getMessage());
    }

    private ResponseEntity<ErrorBody> build(HttpStatus status, String code, String message) {
        return ResponseEntity.status(status).body(new ErrorBody(
                false,
                new ErrorBody.Error(code, message, null),
                OffsetDateTime.now().toString(),
                REQUEST_ID));
    }
}
