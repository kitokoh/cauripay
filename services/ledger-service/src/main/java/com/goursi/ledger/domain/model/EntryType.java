package com.goursi.ledger.domain.model;

/** Type d'une écriture comptable (spec §3.6). */
public enum EntryType {
    PRINCIPAL,
    FEE,
    COMMISSION,
    REVERSAL
}
