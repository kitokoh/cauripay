package com.goursi.ledger.domain.result;

import com.goursi.ledger.domain.model.LedgerEntry;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/** Résultat d'un transferAtomic : les 4 écritures + soldes finaux. */
public record TransferResult(
    UUID transactionId,
    List<LedgerEntry> entries,
    BigDecimal fromBalance,
    BigDecimal toBalance,
    BigDecimal platformFeesBalance) {

  public List<UUID> entryIds() {
    return entries.stream().map(LedgerEntry::getId).toList();
  }
}
