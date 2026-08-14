package com.goursi.ledger.api.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/** Requête de vérification d'équilibre. */
public record VerifyRequest(
        @NotNull UUID walletId
) {}
