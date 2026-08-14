package com.goursi.ledger.domain.result;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Projection légère d'une écriture pour les endpoints credit/debit et l'historique. */
public record LedgerEntryResponse(
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
