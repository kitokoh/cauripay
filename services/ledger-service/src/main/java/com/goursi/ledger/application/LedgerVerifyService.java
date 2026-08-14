package com.goursi.ledger.application;

import com.goursi.ledger.domain.exception.WalletNotFoundException;
import com.goursi.ledger.domain.model.LedgerDirection;
import com.goursi.ledger.domain.repository.LedgerEntryRepository;
import com.goursi.ledger.domain.repository.LedgerBalanceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Contrôle d'intégrité COBAC : SUM(credit) - SUM(debit) des entries
 * doit égaler le solde stocké.
 */
@Service
@RequiredArgsConstructor
public class LedgerVerifyService {

    private static final String BALANCE_QUERY = """
            SELECT COALESCE(SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE -amount END), 0)
            FROM ledger.ledger_entries
            WHERE wallet_id = ?
            """;

    private final JdbcTemplate jdbcTemplate;
    private final LedgerBalanceRepository balanceRepository;
    private final LedgerEntryRepository entryRepository;

    /** Vérifie l'équilibre d'un wallet : SUM(entries) vs solde stocké. */
    @Transactional(readOnly = true)
    public VerifyResult verify(UUID walletId) {
        BigDecimal computed = jdbcTemplate.queryForObject(BALANCE_QUERY, BigDecimal.class, walletId);
        if (computed == null) {
            computed = BigDecimal.ZERO;
        }
        var balance = balanceRepository.findById(walletId)
                .orElseThrow(() -> new WalletNotFoundException(walletId));
        BigDecimal stored = balance.getBalance();
        BigDecimal delta = computed.subtract(stored);
        return new VerifyResult(true, computed, stored, delta);
    }

    /** Équilibre global : 0 ligne d'écart sur des données propres. */
    @Transactional(readOnly = true)
    public long countDiscrepancies() {
        return jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM (
                    SELECT b.wallet_id,
                           COALESCE(SUM(CASE WHEN e.direction = 'CREDIT' THEN e.amount ELSE -e.amount END), 0) AS computed,
                           b.balance
                    FROM ledger.ledger_balances b
                    LEFT JOIN ledger.ledger_entries e ON e.wallet_id = b.wallet_id
                    GROUP BY b.wallet_id, b.balance
                    HAVING COALESCE(SUM(CASE WHEN e.direction = 'CREDIT' THEN e.amount ELSE -e.amount END), 0) <> b.balance
                ) discrepancies
                """, Long.class);
    }

    public record VerifyResult(boolean consistent, BigDecimal computed, BigDecimal stored, BigDecimal delta) {}
}
