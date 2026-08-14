package com.cauripay.ledger.application.result;

import com.cauripay.ledger.domain.EntryType;
import com.cauripay.ledger.domain.LedgerDirection;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Vue lecture d'une écriture (miroir de {@code LedgerEntryView} TS).
 */
public record LedgerEntryView(
    UUID id,
    UUID transactionId,
    UUID walletId,
    LedgerDirection direction,
    BigDecimal amount,
    BigDecimal balanceBefore,
    BigDecimal balanceAfter,
    EntryType entryType,
    String description,
    Instant createdAt) {
}
