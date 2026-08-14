package com.goursi.ledger.api.dto;

import java.math.BigDecimal;
import java.util.UUID;

/** Réponse d'un crédit/débit unitaire. */
public record EntryResponse(
        UUID entryId,
        BigDecimal balanceBefore,
        BigDecimal balanceAfter
) {}
