package com.goursi.ledger.api.dto;

import java.math.BigDecimal;
import java.util.UUID;

/** GOURSI-015a · projection de solde (exposée aux services internes). */
public record BalanceResponse(
        UUID walletId,
        BigDecimal balance,
        BigDecimal frozenBalance,
        BigDecimal availableBalance,
        Long version
) {}
