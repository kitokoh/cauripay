package com.cauripay.ledger.web.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;
import java.util.UUID;

/** Réponse HTTP d'une opération d'écriture (miroir de {@code TransferResult} TS). */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record TransferResponse(
    boolean success,
    UUID transactionId,
    List<UUID> ledgerEntryIds,
    Balances balances,
    String errorCode,
    String errorMessage) {

    public record Balances(UUID from, UUID to, UUID platformFees) {
    }
}
