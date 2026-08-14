package com.cauripay.ledger.common;

import java.util.UUID;

/** 404 — ressource introuvable. */
public class NotFoundException extends BusinessException {

    public NotFoundException(String message) {
        super(ErrorCode.NOT_FOUND, 404, message);
    }

    public static NotFoundException wallet(UUID walletId) {
        return new NotFoundException("Wallet introuvable : " + walletId);
    }
}
