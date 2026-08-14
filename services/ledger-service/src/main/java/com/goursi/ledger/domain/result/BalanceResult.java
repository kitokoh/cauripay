package com.goursi.ledger.domain.result;

import java.math.BigDecimal;
import java.util.UUID;

/** GOURSI-013b — projection de solde exposée aux services internes. */
public record BalanceResult(
        UUID walletId,
        BigDecimal balance,
        BigDecimal frozenBalance,
        BigDecimal availableBalance,
        Long version
) {}
