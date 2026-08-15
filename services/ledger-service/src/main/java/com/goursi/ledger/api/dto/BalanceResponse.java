package com.goursi.ledger.api.dto;

import java.math.BigDecimal;
import java.util.UUID;

/** Solde d'un wallet (API interne). */
public record BalanceResponse(
    UUID walletId,
    BigDecimal balance,
    BigDecimal frozenBalance,
    BigDecimal availableBalance,
    long version) {}
