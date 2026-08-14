package com.cauripay.ledger.web.dto;

import com.cauripay.ledger.domain.EntryType;
import com.cauripay.ledger.domain.LedgerDirection;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Écriture vue en lecture (miroir de {@code LedgerEntryView} TS). */
public record LedgerEntryResponse(
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
