package com.goursi.ledger.domain.result;

import java.math.BigDecimal;
import java.util.UUID;

/** Projection légère d'une écriture (endpoints credit/debit). */
public record LedgerEntryResponse(
        UUID id,
        BigDecimal balanceBefore,
        BigDecimal balanceAfter
) {}
