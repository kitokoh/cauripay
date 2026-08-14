package com.cauripay.ledger.application.result;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Solde courant d'un wallet (miroir de {@code BalanceResult} TS).
 */
public record BalanceResult(UUID walletId, BigDecimal balance, BigDecimal frozenBalance, long version) {
}
