package com.goursi.ledger.domain.result;

import com.goursi.ledger.domain.model.LedgerEntry;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/** Résultat d'un transferAtomique : 4 écritures + soldes finaux. */
public record TransferResult(
        UUID transactionId,
        List<LedgerEntry> entries,
        BigDecimal fromBalance,
        BigDecimal toBalance
) {
    public static TransferResult of(UUID transactionId, List<LedgerEntry> entries,
                                    BigDecimal fromBalance, BigDecimal toBalance) {
        return new TransferResult(transactionId, List.copyOf(entries), fromBalance, toBalance);
    }
}
