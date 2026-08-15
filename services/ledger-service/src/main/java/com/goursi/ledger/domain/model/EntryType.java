package com.goursi.ledger.domain.model;

/** Nature d'une écriture comptable (spec §3.3). */
public enum EntryType {
  PRINCIPAL,
  FEE,
  COMMISSION,
  REVERSAL
}
