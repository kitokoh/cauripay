package com.cauripay.ledger.web.dto;

import java.math.BigDecimal;
import java.util.UUID;

/** Solde courant d'un wallet (lecture). */
public record BalanceResponse(
    UUID walletId,
    BigDecimal balance,
    BigDecimal frozenBalance,
    long version) {
}
