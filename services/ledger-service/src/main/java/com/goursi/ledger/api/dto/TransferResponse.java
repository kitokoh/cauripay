package com.goursi.ledger.api.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/** GOURSI-015a · réponse d'un transfer (4 écritures). */
public record TransferResponse(
        UUID transactionId,
        List<EntryView> entries,
        BigDecimal fromBalance,
        BigDecimal toBalance
) {
    public record EntryView(UUID id, UUID walletId, String direction, BigDecimal amount,
                            BigDecimal balanceBefore, BigDecimal balanceAfter, String entryType,
                            String description) {}
}
