package com.goursi.ledger.api.envelope;

import java.time.Instant;
import java.util.UUID;

/**
 * Enveloppe de SUCCÈS de l'API interne (contrat cross-service, miroir de
 * {@code ApiEnvelope} côté TS) : { success:true, data, timestamp, requestId }.
 */
public record SuccessEnvelope<T>(boolean success, T data, Instant timestamp, String requestId) {

  public static <T> SuccessEnvelope<T> of(T data, String requestId) {
    String rid = (requestId == null || requestId.isBlank())
        ? UUID.randomUUID().toString()
        : requestId;
    return new SuccessEnvelope<>(true, data, Instant.now(), rid);
  }
}
