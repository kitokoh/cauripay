package com.cauripay.ledger.common;

import java.util.UUID;

/** 422 — solde insuffisant (le montant demandé dépasse le solde disponible). */
public class InsufficientFundsException extends BusinessException {

    public InsufficientFundsException(UUID walletId) {
        super(ErrorCode.INSUFFICIENT_FUNDS, 422,
            "Solde insuffisant sur le wallet " + walletId + ".");
    }
}
