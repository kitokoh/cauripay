package com.cauripay.ledger.common;

/**
 * Enveloppe d'erreur uniforme (miroir de {@code ApiErrorEnvelope} côté TS).
 */
public record ApiError(ErrorCode code, String message, Object details) {

    public static ApiError of(ErrorCode code, String message) {
        return new ApiError(code, message, null);
    }

    public static ApiError of(ErrorCode code, String message, Object details) {
        return new ApiError(code, message, details);
    }
}
