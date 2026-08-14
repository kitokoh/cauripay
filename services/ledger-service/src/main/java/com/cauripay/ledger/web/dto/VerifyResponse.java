package com.cauripay.ledger.web.dto;

import java.math.BigDecimal;

/** Rapport de contrôle d'intégrité (GOURSI-016c). */
public record VerifyResponse(
    long entryCount,
    BigDecimal totalDebits,
    BigDecimal totalCredits,
    int unbalancedTransactions,
    int balanceDrifts,
    boolean ok) {
}
