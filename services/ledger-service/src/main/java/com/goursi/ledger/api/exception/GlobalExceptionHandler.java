package com.goursi.ledger.api.exception;

<<<<<<< HEAD
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
=======
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
>>>>>>> d17144a (feat(GOURSI-010..016): ledger-service Spring Boot 3.2 — grand livre comptable (G1))
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
<<<<<<< HEAD
 * Traduit toute exception en enveloppe d'erreur structurée (GOURSI-010c).
 *
 * <p>Codes HTTP métier :
 * 400 malformed JSON · 401/403 sécurité · 409 idempotence / verrou optimiste ·
 * 422 validation / solde insuffisant · 500 interne (jamais de détail exposé).
=======
 * Enveloppe d'erreur stable : { success:false, error:{ code, message, details } }.
 * Log systématique avant renvoi — jamais d'exception avalée (liste rouge #7).
>>>>>>> d17144a (feat(GOURSI-010..016): ledger-service Spring Boot 3.2 — grand livre comptable (G1))
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

<<<<<<< HEAD
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
=======
  private record ErrorBody(boolean success, ErrorEnvelope error, Instant timestamp) {}

  private static ErrorBody body(String code, String message, Map<String, Object> details) {
    return new ErrorBody(false, ErrorEnvelope.of(code, message, details, null), Instant.now());
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
>>>>>>> d17144a (feat(GOURSI-010..016): ledger-service Spring Boot 3.2 — grand livre comptable (G1))
  }
}
