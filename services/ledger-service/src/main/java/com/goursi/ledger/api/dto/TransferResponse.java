package com.goursi.ledger.api.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/** Réponse d'un transfer : les 4 écritures + soldes finaux. */
public record TransferResponse(
    UUID transactionId,
    List<LedgerEntryDto> entries,
    BigDecimal fromBalance,
    BigDecimal toBalance,
    BigDecimal platformFeesBalance) {}
