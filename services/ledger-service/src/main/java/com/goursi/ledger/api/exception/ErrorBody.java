package com.goursi.ledger.api.exception;

import java.time.Instant;
import java.util.Map;

/** Enveloppe d'erreur renvoyée par GlobalExceptionHandler (marqueur pour EnvelopeAdvice). */
public record ErrorBody(boolean success, ErrorDetail error, Instant timestamp) {

  public record ErrorDetail(String code, String message, Map<String, Object> details) {}
}
