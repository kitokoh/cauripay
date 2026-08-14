package com.goursi.ledger.api.exception;

import com.goursi.ledger.domain.exception.DuplicateReversalException;
import com.goursi.ledger.domain.exception.IdempotencyConflictException;
import com.goursi.ledger.domain.exception.InsufficientFundsException;
import com.goursi.ledger.domain.exception.WalletNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
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
 * GOURSI-010c — enveloppe d'erreur structurée, FLAT et stable :
 * { code, message, details?, timestamp, requestId }.
 * Log systématique avant renvoi — jamais d'exception avalée (liste rouge #7).
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  private static ErrorEnvelope env(HttpServletRequest req, String code, String message, Map<String, Object> details) {
    String requestId = req.getHeader("X-Request-Id");
    if (requestId == null) {
      requestId = java.util.UUID.randomUUID().toString();
    }
    return ErrorEnvelope.of(code, message, details, requestId);
  }

  @ExceptionHandler(WalletNotFoundException.class)
  public ResponseEntity<ErrorEnvelope> walletNotFound(WalletNotFoundException e, HttpServletRequest req) {
    log.warn("404 {}", e.getMessage());
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(env(req, "WALLET_NOT_FOUND", e.getMessage(), Map.of("walletId", String.valueOf(e.getWalletId()))));
  }

  @ExceptionHandler(IdempotencyConflictException.class)
  public ResponseEntity<ErrorEnvelope> idempotencyConflict(IdempotencyConflictException e, HttpServletRequest req) {
    log.warn("409 {}", e.getMessage());
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(env(req, "IDEMPOTENCY_CONFLICT", e.getMessage(), Map.of("idempotencyKey", e.getIdempotencyKey())));
  }

  @ExceptionHandler(DuplicateReversalException.class)
  public ResponseEntity<ErrorEnvelope> duplicateReversal(DuplicateReversalException e, HttpServletRequest req) {
    log.warn("409 {}", e.getMessage());
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(env(req, "DUPLICATE_REVERSAL", e.getMessage(), Map.of("transactionId", e.getTransactionId().toString())));
  }

  @ExceptionHandler(InsufficientFundsException.class)
  public ResponseEntity<ErrorEnvelope> insufficientFunds(InsufficientFundsException e, HttpServletRequest req) {
    log.warn("422 {}", e.getMessage());
    return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
        .body(env(req, "INSUFFICIENT_FUNDS", "Solde insuffisant", Map.of(
            "walletId", e.getWalletId().toString(),
            "balance", e.getBalance(),
            "requested", e.getRequested())));
  }

  @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
  public ResponseEntity<ErrorEnvelope> optimisticLock(ObjectOptimisticLockingFailureException e, HttpServletRequest req) {
    log.warn("409 OptimisticLock : {}", e.getMessage());
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(env(req, "OPTIMISTIC_LOCK", "Conflit de concurrence — retenter l'opération", null));
  }

  @ExceptionHandler({IllegalArgumentException.class, MethodArgumentNotValidException.class})
  public ResponseEntity<ErrorEnvelope> validation(Exception e, HttpServletRequest req) {
    String detail = e instanceof MethodArgumentNotValidException manve
        ? String.valueOf(manve.getBindingResult().getFieldErrors().stream()
            .map(fe -> fe.getField() + ": " + fe.getDefaultMessage()).toList())
        : e.getMessage();
    log.warn("422 {}", e.getMessage());
    return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
        .body(env(req, "VALIDATION_ERROR", e.getMessage(), Map.of("details", detail)));
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ErrorEnvelope> generic(Exception e, HttpServletRequest req) {
    log.error("500 inattendu", e); // stacktrace complète avant renvoi
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(env(req, "INTERNAL_ERROR", "Erreur interne du service", null));
  }
}
