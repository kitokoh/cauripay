package com.goursi.ledger.api.dto;

import java.math.BigDecimal;
import java.util.UUID;

/** Réponse de solde. */
public record BalanceResponse(
        UUID walletId,
        BigDecimal balance,
        BigDecimal frozenBalance,
        BigDecimal availableBalance,
        long version
) {}
