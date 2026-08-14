package com.goursi.ledger.domain.result;

import java.math.BigDecimal;
import java.util.UUID;

/** Solde d'un wallet. */
public record BalanceResult(
        UUID walletId,
        BigDecimal balance,
        BigDecimal frozenBalance,
        BigDecimal availableBalance,
        long version
) {
    public static BalanceResult of(UUID walletId, BigDecimal balance, BigDecimal frozenBalance,
                                   BigDecimal availableBalance, long version) {
        return new BalanceResult(walletId, balance, frozenBalance, availableBalance, version);
    }
}
