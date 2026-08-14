package com.goursi.ledger.domain.result;

import java.math.BigDecimal;
import java.util.UUID;

/** GOURSI-013b — projection légère d'une écriture (credit/debit unitaires). */
public record LedgerEntryResponse(
        UUID id,
        BigDecimal balanceBefore,
        BigDecimal balanceAfter
) {}
