package com.goursi.ledger.domain.result;

import java.math.BigDecimal;
import java.util.UUID;

/** Solde d'un wallet (lecture). */
public record BalanceResult(
    UUID walletId,
    BigDecimal balance,
    BigDecimal frozenBalance,
    BigDecimal availableBalance,
    long version) {}
