package com.cauripay.ledger.domain;

/** Type d'une écriture (miroir de {@code EntryType} TS). */
public enum EntryType {
    PRINCIPAL,
    FEE,
    COMMISSION,
    REVERSAL
}
