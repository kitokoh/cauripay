package com.cauripay.ledger.common;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Gestion centralisée des erreurs (GOURSI-010c) — enveloppe uniforme :
 * {@code { success:false, timestamp, requestId, error:{ code, message, details } }}.
 * L'erreur interne ne fuit JAMAIS vers le client (log + 500 générique).
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger LOG = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    private static final String REQUEST_ID_HEADER = "X-Request-Id";

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<Map<String, Object>> business(BusinessException e, HttpServletRequest request) {
        return build(e.status(), e.code().name(), e.getMessage(), null, request);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> validation(MethodArgumentNotValidException e,
                                                          HttpServletRequest request) {
        final Map<String, String> details = new LinkedHashMap<>();
        e.getBindingResult().getFieldErrors()
            .forEach(fieldError -> details.put(fieldError.getField(), fieldError.getDefaultMessage()));
        return build(HttpStatus.BAD_REQUEST.value(), ErrorCode.VALIDATION_FAILED.name(),
            "Requête invalide.", details, request);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Map<String, Object>> constraints(ConstraintViolationException e,
                                                           HttpServletRequest request) {
        return build(HttpStatus.BAD_REQUEST.value(), ErrorCode.VALIDATION_FAILED.name(),
            "Requête invalide.", e.getMessage(), request);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> unreadable(HttpMessageNotReadableException e,
                                                          HttpServletRequest request) {
        return build(HttpStatus.BAD_REQUEST.value(), ErrorCode.VALIDATION_FAILED.name(),
            "Corps de requête illisible (JSON / UUID invalide).", null, request);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> illegalArgument(IllegalArgumentException e,
                                                               HttpServletRequest request) {
        return build(HttpStatus.BAD_REQUEST.value(), ErrorCode.VALIDATION_FAILED.name(),
            e.getMessage(), null, request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> unexpected(Exception e, HttpServletRequest request) {
        LOG.error("Erreur interne non gérée — {} {}", request.getMethod(), request.getRequestURI(), e);
        return build(HttpStatus.INTERNAL_SERVER_ERROR.value(), ErrorCode.INTERNAL_ERROR.name(),
            "Erreur interne.", null, request);
    }

    private ResponseEntity<Map<String, Object>> build(
        int status, String code, String message, Object details, HttpServletRequest request) {
        final String headerRequestId = request.getHeader(REQUEST_ID_HEADER);
        final String requestId = (headerRequestId == null || headerRequestId.isBlank())
            ? UUID.randomUUID().toString()
            : headerRequestId;
        final Map<String, Object> error = new LinkedHashMap<>();
        error.put("code", code);
        error.put("message", message);
        if (details != null) {
            error.put("details", details);
        }
        final Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("success", false);
        envelope.put("timestamp", Instant.now().toString());
        envelope.put("requestId", requestId);
        envelope.put("error", error);
        return ResponseEntity.status(status).body(envelope);
    }
}
