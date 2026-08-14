package com.goursi.ledger.api.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Projection d'une écriture (API interne). */
public record LedgerEntryDto(
    UUID id,
    UUID transactionId,
    UUID walletId,
    String direction,
    BigDecimal amount,
    BigDecimal balanceBefore,
    BigDecimal balanceAfter,
    String entryType,
    String description,
    Instant createdAt) {}
