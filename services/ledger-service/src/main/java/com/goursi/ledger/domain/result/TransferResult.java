package com.goursi.ledger.domain.result;

import com.goursi.ledger.domain.model.LedgerEntry;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/** GOURSI-013b — résultat d'un transferAtomique (4 écritures). */
public record TransferResult(
        UUID transactionId,
        List<LedgerEntry> entries,
        BigDecimal fromBalance,
        BigDecimal toBalance
) {}
