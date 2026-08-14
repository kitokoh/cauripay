package com.goursi.ledger.api.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/** Réponse de transfert. */
public record TransferResponse(
        UUID transactionId,
        List<EntryDto> entries,
        BigDecimal fromBalance,
        BigDecimal toBalance
) {
    public record EntryDto(
            UUID id,
            UUID walletId,
            String direction,
            BigDecimal amount,
            BigDecimal balanceBefore,
            BigDecimal balanceAfter,
            String entryType,
            String description
    ) {}
}
