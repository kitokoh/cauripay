package com.goursi.ledger.api.exception;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.util.Map;

/**
 * Enveloppe d'erreur structurée (miroir de {@code ApiErrorEnvelope} côté TS).
 * Sérialisation JSON stable : {@code { code, message, details?, timestamp, requestId }}.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorEnvelope(
    String code,
    String message,
    Map<String, Object> details,
    Instant timestamp,
    String requestId) {

  public static ErrorEnvelope of(String code, String message, String requestId) {
    return new ErrorEnvelope(code, message, null, Instant.now(), requestId);
  }

  public static ErrorEnvelope of(String code, String message, Map<String, Object> details, String requestId) {
    return new ErrorEnvelope(code, message, details, Instant.now(), requestId);
  }
}
