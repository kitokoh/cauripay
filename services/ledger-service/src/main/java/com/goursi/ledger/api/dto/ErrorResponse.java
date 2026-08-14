package com.goursi.ledger.api.dto;

/** GOURSI-010c · enveloppe d'erreur structurée { success:false, error:{code,message,details} }. */
public record ErrorResponse(boolean success, ErrorBody error) {
    public record ErrorBody(String code, String message, Object details) {
        public static ErrorBody of(String code, String message) {
            return new ErrorBody(code, message, null);
        }
    }

    public static ErrorResponse of(String code, String message) {
        return new ErrorResponse(false, ErrorBody.of(code, message));
    }

    public static ErrorResponse of(String code, String message, Object details) {
        return new ErrorResponse(false, new ErrorBody(code, message, details));
    }
}
