package com.cauripay.ledger;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Tests d'acceptation des migrations (GOURSI-011d, DoD #3/#4) :
 * <ul>
 *   <li>les triggers d'immutabilité refusent UPDATE/DELETE sur les écritures ;</li>
 *   <li>le solde ne peut pas devenir négatif (trigger + CHECK) ;</li>
 *   <li>les vues d'audit existent et l'équilibre est vérifiable.</li>
 * </ul>
 *
 * <p>{@code @Transactional} : chaque test rollback à la fin → les données
 * d'acceptation ne polluent pas les autres tests d'intégration (base partagée).
 */
@org.springframework.transaction.annotation.Transactional
class MigrationAcceptanceIT extends AbstractLedgerIT {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void schemaLedgerExistsWithExpectedObjects() {
        final Integer entries = jdbcTemplate.queryForObject("""
            SELECT COUNT(*) FROM information_schema.tables
            WHERE table_schema = 'ledger' AND table_name = 'ledger_entries'
            """, Integer.class);
        assertThat(entries).isEqualTo(1);

        final Integer triggers = jdbcTemplate.queryForObject("""
            SELECT COUNT(*) FROM pg_trigger t
            JOIN pg_class c ON t.tgrelid = c.oid
            JOIN pg_namespace n ON c.relnamespace = n.oid
            WHERE n.nspname = 'ledger' AND c.relname = 'ledger_entries' AND NOT t.tgisinternal
            """, Integer.class);
        assertThat(triggers).isEqualTo(1);
    }

    @Test
    void updateOnLedgerEntryIsForbiddenByTrigger() {
        final UUID transactionId = UUID.randomUUID();
        final UUID walletId = UUID.randomUUID();
        jdbcTemplate.update("""
            INSERT INTO ledger.ledger_balances (wallet_id, balance, frozen_balance, version)
            VALUES (?, 100.00, 0, 0)
            """, walletId);
        jdbcTemplate.update("""
            INSERT INTO ledger.ledger_entries
                (id, transaction_id, wallet_id, direction, amount, balance_before, balance_after, entry_type)
            VALUES (uuid_generate_v4(), ?, ?, 'CREDIT', 100.00, 0, 100.00, 'PRINCIPAL')
            """, transactionId, walletId);

        // Une seule requête violante par test : PostgreSQL aborte la transaction
        // après une exception de trigger (le rollback de fin de test fait le reste).
        assertThatThrownBy(() -> jdbcTemplate.update("""
            UPDATE ledger.ledger_entries SET amount = 999 WHERE transaction_id = ?
            """, transactionId))
            .isInstanceOf(org.springframework.dao.DataAccessException.class)
            .hasMessageContaining("immuables");
    }

    @Test
    void deleteOnLedgerEntryIsForbiddenByTrigger() {
        final UUID transactionId = UUID.randomUUID();
        final UUID walletId = UUID.randomUUID();
        jdbcTemplate.update("""
            INSERT INTO ledger.ledger_balances (wallet_id, balance, frozen_balance, version)
            VALUES (?, 100.00, 0, 0)
            """, walletId);
        jdbcTemplate.update("""
            INSERT INTO ledger.ledger_entries
                (id, transaction_id, wallet_id, direction, amount, balance_before, balance_after, entry_type)
            VALUES (uuid_generate_v4(), ?, ?, 'CREDIT', 100.00, 0, 100.00, 'PRINCIPAL')
            """, transactionId, walletId);

        assertThatThrownBy(() -> jdbcTemplate.update("""
            DELETE FROM ledger.ledger_entries WHERE transaction_id = ?
            """, transactionId))
            .isInstanceOf(org.springframework.dao.DataAccessException.class)
            .hasMessageContaining("immuables");
    }

    @Test
    void negativeBalanceIsRejected() {
        final UUID walletId = UUID.randomUUID();
        jdbcTemplate.update("""
            INSERT INTO ledger.ledger_balances (wallet_id, balance, frozen_balance, version)
            VALUES (?, 10.00, 0, 0)
            """, walletId);

        assertThatThrownBy(() -> jdbcTemplate.update("""
            UPDATE ledger.ledger_balances SET balance = -5 WHERE wallet_id = ?
            """, walletId))
            .isInstanceOf(org.springframework.dao.DataAccessException.class)
            .hasMessageContaining("négatif");
    }

    @Test
    void auditViewsExposeEquilibrium() {
        // Une transaction équilibrée : débit + crédit
        final UUID transactionId = UUID.randomUUID();
        final UUID walletA = UUID.randomUUID();
        final UUID walletB = UUID.randomUUID();
        jdbcTemplate.update("""
            INSERT INTO ledger.ledger_balances (wallet_id, balance, frozen_balance, version)
            VALUES (?, 100.00, 0, 0), (?, 0.00, 0, 0)
            """, walletA, walletB);
        jdbcTemplate.update("""
            INSERT INTO ledger.ledger_entries
                (id, transaction_id, wallet_id, direction, amount, balance_before, balance_after, entry_type)
            VALUES (uuid_generate_v4(), ?, ?, 'DEBIT', 40.00, 100, 60, 'PRINCIPAL')
            """, transactionId, walletA);
        jdbcTemplate.update("""
            INSERT INTO ledger.ledger_entries
                (id, transaction_id, wallet_id, direction, amount, balance_before, balance_after, entry_type)
            VALUES (uuid_generate_v4(), ?, ?, 'CREDIT', 40.00, 0, 40, 'PRINCIPAL')
            """, transactionId, walletB);

        final List<Map<String, Object>> deltas = jdbcTemplate.queryForList("""
            SELECT transaction_id, delta FROM ledger.v_audit_balance_equilibrium
            WHERE transaction_id = ? AND delta <> 0
            """, transactionId);
        assertThat(deltas).isEmpty();

        final BigDecimal total = jdbcTemplate.queryForObject("""
            SELECT COALESCE(SUM(amount), 0) FROM ledger.ledger_entries WHERE transaction_id = ?
            """, BigDecimal.class, transactionId);
        assertThat(total).isEqualByComparingTo("80.00");
    }
}
