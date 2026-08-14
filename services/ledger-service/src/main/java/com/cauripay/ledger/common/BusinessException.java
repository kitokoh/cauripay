package com.cauripay.ledger.common;

/**
 * Exception métier de base : portée par un {@link ErrorCode} et un statut HTTP.
 */
public abstract class BusinessException extends RuntimeException {

    private final ErrorCode code;
    private final int status;

    protected BusinessException(ErrorCode code, int status, String message) {
        super(message);
        this.code = code;
        this.status = status;
    }

    protected BusinessException(ErrorCode code, int status, String message, Throwable cause) {
        super(message, cause);
        this.code = code;
        this.status = status;
    }

    public final ErrorCode code() {
        return code;
    }

    public final int status() {
        return status;
    }
}
