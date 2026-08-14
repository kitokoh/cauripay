package com.goursi.ledger.api.exception;

import com.goursi.ledger.domain.exception.DuplicateReversalException;
import com.goursi.ledger.domain.exception.IdempotencyConflictException;
import com.goursi.ledger.domain.exception.InsufficientFundsException;
import com.goursi.ledger.domain.exception.WalletNotFoundException;
import java.time.Instant;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Enveloppe d'erreur stable : { success:false, error:{ code, message, details } }.
 * Log systématique avant renvoi — jamais d'exception avalée (liste rouge #7).
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  private record ErrorBody(boolean success, ErrorDetail error, String timestamp) {}

  private record ErrorDetail(String code, String message, Map<String, Object> details) {}

  private static ErrorBody body(String code, String message, Map<String, Object> details) {
    return new ErrorBody(false, new ErrorDetail(code, message, details), Instant.now().toString());
  }

  @ExceptionHandler(WalletNotFoundException.class)
  public ResponseEntity<ErrorBody> walletNotFound(WalletNotFoundException e) {
    log.warn("404 {}", e.getMessage());
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(body("WALLET_NOT_FOUND", e.getMessage(), Map.of("walletId", String.valueOf(e.getWalletId()))));
  }

  @ExceptionHandler(IdempotencyConflictException.class)
  public ResponseEntity<ErrorBody> idempotencyConflict(IdempotencyConflictException e) {
    log.warn("409 {}", e.getMessage());
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(body("IDEMPOTENCY_CONFLICT", e.getMessage(), Map.of("idempotencyKey", e.getIdempotencyKey())));
  }

  @ExceptionHandler(DuplicateReversalException.class)
  public ResponseEntity<ErrorBody> duplicateReversal(DuplicateReversalException e) {
    log.warn("409 {}", e.getMessage());
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(body("DUPLICATE_REVERSAL", e.getMessage(), Map.of("transactionId", e.getTransactionId().toString())));
  }

  @ExceptionHandler(InsufficientFundsException.class)
  public ResponseEntity<ErrorBody> insufficientFunds(InsufficientFundsException e) {
    log.warn("422 {}", e.getMessage());
    return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
        .body(body("INSUFFICIENT_FUNDS", "Solde insuffisant", Map.of(
            "walletId", e.getWalletId().toString(),
            "available", e.getAvailable().toPlainString(),
            "requested", e.getRequested().toPlainString())));
  }

  @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
  public ResponseEntity<ErrorBody> optimisticLock(ObjectOptimisticLockingFailureException e) {
    log.warn("409 OptimisticLock : {}", e.getMessage());
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(body("OPTIMISTIC_LOCK", "Conflit de concurrence — retenter l'opération", null));
  }

  @ExceptionHandler({IllegalArgumentException.class, MethodArgumentNotValidException.class})
  public ResponseEntity<ErrorBody> validation(Exception e) {
    String detail = e instanceof MethodArgumentNotValidException manve
        ? String.valueOf(manve.getBindingResult().getFieldErrors().stream()
            .map(fe -> fe.getField() + ": " + fe.getDefaultMessage()).toList())
        : e.getMessage();
    log.warn("422 {}", e.getMessage());
    return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
        .body(body("VALIDATION_ERROR", e.getMessage(), Map.of("details", detail)));
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ErrorBody> generic(Exception e) {
    log.error("500 inattendu", e); // stacktrace complète avant renvoi
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(body("INTERNAL_ERROR", "Erreur interne", null));
  }
}
