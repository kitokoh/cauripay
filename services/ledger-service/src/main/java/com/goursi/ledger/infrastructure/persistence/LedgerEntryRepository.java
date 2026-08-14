package com.goursi.ledger.infrastructure.persistence;

import com.goursi.ledger.domain.model.LedgerEntry;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Lecture seule (l'entité est @Immutable — aucun update/delete possible). */
public interface LedgerEntryRepository extends JpaRepository<LedgerEntry, UUID> {

  List<LedgerEntry> findByTransactionId(UUID transactionId);

  long countByTransactionId(UUID transactionId);

  List<LedgerEntry> findByWalletIdOrderByCreatedAtDesc(UUID walletId, Pageable pageable);

  @Query("select count(e) from LedgerEntry e where e.walletId = :walletId and e.createdAt >= :from")
  long countByWalletSince(@Param("walletId") UUID walletId, @Param("from") Instant from);

  @Query("""
      select coalesce(sum(case when e.direction = 'CREDIT' then e.amount else 0 end), 0),
             coalesce(sum(case when e.direction = 'DEBIT'  then e.amount else 0 end), 0)
      from LedgerEntry e where e.createdAt >= :from and e.createdAt < :to
      """)
  Object[] sumByDirectionBetween(@Param("from") Instant from, @Param("to") Instant to);

  boolean existsByTransactionIdAndEntryType(UUID transactionId, com.goursi.ledger.domain.model.EntryType entryType);

  /** Solde calculé par wallet : SUM(CREDIT) - SUM(DEBIT) depuis toutes les écritures. */
  @Query(value = """
      select wallet_id, sum(case when direction = 'CREDIT' then amount else -amount end) as computed
      from ledger.ledger_entries
      group by wallet_id
      """, nativeQuery = true)
  List<Object[]> computedBalancesByWallet();

  /** Nombre d'écritures d'un wallet (checkpoints). */
  @Query("select count(e) from LedgerEntry e where e.walletId = :walletId")
  long countByWallet(@Param("walletId") UUID walletId);
}
