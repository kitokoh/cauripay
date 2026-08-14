package com.cauripay.ledger.application;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Contrôle d'intégrité comptable (GOURSI-016c) — vérification COBAC :
 * <ul>
 *   <li>{@link #verifyEquilibrium()} : chaque transaction est équilibrée
 *       (ΣCREDIT = ΣDEBIT) — DoD #4, 0 écart attendu ;</li>
 *   <li>{@link #verifyBalances()} : le solde de chaque wallet correspond à la
 *       somme de ses écritures (SUM vs balance).</li>
 * </ul>
 */
@Service
public class LedgerVerifyService {

    private final JdbcTemplate jdbcTemplate;

    public LedgerVerifyService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /** Transactions multi-écritures dont ΣCREDIT ≠ ΣDEBIT (doit être vide).
     *  Les transactions à écriture unique (émission/approvisionnement du compte
     *  capital) sont exemptées : seule la conservation de la monnaie est contrôlée. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> verifyEquilibrium() {
        return jdbcTemplate.queryForList("""
            SELECT transaction_id, delta, entry_count
            FROM (
                SELECT transaction_id,
                       SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE -amount END) AS delta,
                       COUNT(*) AS entry_count
                FROM ledger.ledger_entries
                GROUP BY transaction_id
            ) per_transaction
            WHERE delta <> 0 AND entry_count > 1
            ORDER BY transaction_id
            """);
    }

    /** Wallets dont le solde diverge de la somme de leurs écritures. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> verifyBalances() {
        return jdbcTemplate.queryForList("""
            SELECT b.wallet_id,
                   b.balance,
                   COALESCE(SUM(CASE WHEN e.direction = 'CREDIT' THEN e.amount ELSE -e.amount END), 0)
                     AS computed_balance
            FROM ledger.ledger_balances b
            LEFT JOIN ledger.ledger_entries e ON e.wallet_id = b.wallet_id
            GROUP BY b.wallet_id, b.balance
            HAVING b.balance <> COALESCE(
                SUM(CASE WHEN e.direction = 'CREDIT' THEN e.amount ELSE -e.amount END), 0)
            ORDER BY b.wallet_id
            """);
    }

    /** Rapport de contrôle complet. */
    @Transactional(readOnly = true)
    public VerifyReport verify() {
        final List<Map<String, Object>> imbalances = verifyEquilibrium();
        final List<Map<String, Object>> balanceDrifts = verifyBalances();
        final long entries = Optional.ofNullable(
            jdbcTemplate.queryForObject("SELECT COUNT(*) FROM ledger.ledger_entries", Long.class))
            .orElse(0L);
        final BigDecimal totalDebits = Optional.ofNullable(jdbcTemplate.queryForObject("""
            SELECT COALESCE(SUM(amount), 0) FROM ledger.ledger_entries WHERE direction = 'DEBIT'
            """, BigDecimal.class)).orElse(BigDecimal.ZERO);
        final BigDecimal totalCredits = Optional.ofNullable(jdbcTemplate.queryForObject("""
            SELECT COALESCE(SUM(amount), 0) FROM ledger.ledger_entries WHERE direction = 'CREDIT'
            """, BigDecimal.class)).orElse(BigDecimal.ZERO);
        return new VerifyReport(
            entries,
            totalDebits,
            totalCredits,
            imbalances.size(),
            balanceDrifts.size(),
            imbalances.isEmpty() && balanceDrifts.isEmpty());
    }

    /** Rapport d'intégrité. */
    public record VerifyReport(
        long entryCount,
        BigDecimal totalDebits,
        BigDecimal totalCredits,
        int unbalancedTransactions,
        int balanceDrifts,
        boolean ok) {
    }
}
