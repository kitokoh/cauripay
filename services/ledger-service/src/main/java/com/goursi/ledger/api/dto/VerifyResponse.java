package com.goursi.ledger.api.dto;

import java.math.BigDecimal;

/** Rapport de vérification COBAC. */
public record VerifyResponse(
    boolean balanced,
    int walletsChecked,
    java.util.List<DiscrepancyDto> discrepancies) {

  public record DiscrepancyDto(String walletId, BigDecimal storedBalance, BigDecimal computedBalance, BigDecimal delta) {}
}
