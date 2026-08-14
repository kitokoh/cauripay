package com.goursi.ledger.domain.model;

/** Statut d'une transaction financière publiée sur financial.events. */
public enum LedgerTransactionStatus {
  COMPLETED,
  FAILED,
  REVERSED
}
