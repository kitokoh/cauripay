package com.cauripay.ledger.common;

/** 401 — clé de service absente ou invalide (X-Service-Key). */
public class InvalidServiceKeyException extends BusinessException {

    public InvalidServiceKeyException() {
        super(ErrorCode.INVALID_SERVICE_KEY, 401,
            "Clé de service invalide ou absente (X-Service-Key).");
    }
}
