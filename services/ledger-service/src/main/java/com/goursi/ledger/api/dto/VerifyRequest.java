package com.goursi.ledger.api.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/** GOURSI-016c · demande de contrôle d'intégrité. */
public record VerifyRequest(@NotNull UUID walletId) {}
