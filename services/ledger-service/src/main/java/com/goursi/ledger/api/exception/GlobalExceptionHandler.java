package com.goursi.ledger.api.exception;

import com.goursi.ledger.domain.exception.IdempotencyConflictException;
import com.goursi.ledger.domain.exception.InsufficientFundsException;
import jakarta.servlet.http.HttpServletRequest;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Traduit toute exception en enveloppe d'erreur structurée (GOURSI-010c).
 *
 * <p>Codes HTTP métier :
 * 400 malformed JSON · 401/403 sécurité · 409 idempotence / verrou optimiste ·
 * 422 validation / solde insuffisant · 500 interne (jamais de détail exposé).
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  @ExceptionHandler(InsufficientFundsException.class)
  public ResponseEntity<ErrorEnvelope> insufficientFunds(InsufficientFundsException ex, HttpServletRequest req) {
    Map<String, Object> details = new LinkedHashMap<>();
    details.put("walletId", ex.getWalletId());
    details.put("balance", ex.getBalance());
    details.put("requested", ex.getRequested());
    return build(HttpStatus.UNPROCESSABLE_ENTITY, "INSUFFICIENT_FUNDS", ex.getMessage(), details, req);
  }

  @ExceptionHandler(IdempotencyConflictException.class)
  public ResponseEntity<ErrorEnvelope> idempotencyConflict(IdempotencyConflictException ex, HttpServletRequest req) {
    Map<String, Object> details = new LinkedHashMap<>();
    details.put("idempotencyKey", ex.getIdempotencyKey());
    return build(HttpStatus.CONFLICT, "IDEMPOTENCY_CONFLICT", ex.getMessage(), details, req);
  }

  @ExceptionHandler(OptimisticLockingFailureException.class)
  public ResponseEntity<ErrorEnvelope> optimisticLock(OptimisticLockingFailureException ex, HttpServletRequest req) {
    return build(HttpStatus.CONFLICT, "OPTIMISTIC_LOCK",
        "Conflit d'écriture concurrente — relancer l'opération", null, req);
  }

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<ErrorEnvelope> invalidArgument(IllegalArgumentException ex, HttpServletRequest req) {
    return build(HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION_ERROR", ex.getMessage(), null, req);
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ErrorEnvelope> validation(MethodArgumentNotValidException ex, HttpServletRequest req) {
    Map<String, Object> details = new LinkedHashMap<>();
    ex.getBindingResult().getFieldErrors()
        .forEach(e -> details.put(e.getField(), e.getDefaultMessage()));
    return build(HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION_ERROR", "Requête invalide", details, req);
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  public ResponseEntity<ErrorEnvelope> unreadable(HttpMessageNotReadableException ex, HttpServletRequest req) {
    return build(HttpStatus.BAD_REQUEST, "MALFORMED_JSON", "Corps de requête illisible", null, req);
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ErrorEnvelope> generic(Exception ex, HttpServletRequest req) {
    log.error("Erreur interne non gérée [{}]", requestId(req), ex);
    return build(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR",
        "Erreur interne du service", null, req);
  }

  private ResponseEntity<ErrorEnvelope> build(HttpStatus status, String code, String message,
      Map<String, Object> details, HttpServletRequest req) {
    ErrorEnvelope envelope = ErrorEnvelope.of(code, message, details, requestId(req));
    return ResponseEntity.status(status).body(envelope);
  }

  private String requestId(HttpServletRequest req) {
    String rid = req.getHeader("X-Request-Id");
    return rid != null && !rid.isBlank() ? rid : UUID.randomUUID().toString();
  }
}
