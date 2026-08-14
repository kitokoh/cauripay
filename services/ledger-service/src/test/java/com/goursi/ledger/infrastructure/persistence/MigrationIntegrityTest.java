package com.goursi.ledger.infrastructure.persistence;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Preuve d'intégrité (spec §8.4) : les triggers V5 sont actifs sur une vraie base.
 * Les messages d'erreur exacts sont assertés.
 */
@SpringBootTest
@Tag("integration")
@Testcontainers
@ActiveProfiles("test")
class MigrationIntegrityTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("cauripay")
            .withUsername("postgres")
            .withPassword("postgres");

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void update_on_ledger_entries_is_forbidden() {
        // Préparation : une entrée existante
        UUID tx = UUID.randomUUID();
        UUID wallet = UUID.randomUUID();
        jdbcTemplate.update("""
                INSERT INTO ledger.ledger_entries
                    (transaction_id, wallet_id, direction, amount, balance_before, balance_after, entry_type, description)
                VALUES (?, ?, 'CREDIT', 100.00, 0.00, 100.00, 'PRINCIPAL', 'test')
                """, tx, wallet);

        Exception ex = assertThrows(Exception.class, () ->
                jdbcTemplate.update("UPDATE ledger.ledger_entries SET amount = 999 WHERE transaction_id = ?", tx));
        assertTrue(ex.getMessage().contains("Opération interdite: UPDATE sur ledger_entries"),
                "Message attendu: " + ex.getMessage());
    }

    @Test
    void delete_on_ledger_entries_is_forbidden() {
        UUID tx = UUID.randomUUID();
        UUID wallet = UUID.randomUUID();
        jdbcTemplate.update("""
                INSERT INTO ledger.ledger_entries
                    (transaction_id, wallet_id, direction, amount, balance_before, balance_after, entry_type, description)
                VALUES (?, ?, 'DEBIT', 100.00, 500.00, 400.00, 'PRINCIPAL', 'test')
                """, tx, wallet);

        Exception ex = assertThrows(Exception.class, () ->
                jdbcTemplate.update("DELETE FROM ledger.ledger_entries WHERE transaction_id = ?", tx));
        assertTrue(ex.getMessage().contains("Opération interdite: DELETE sur ledger_entries"),
                "Message attendu: " + ex.getMessage());
    }

    @Test
    void negative_balance_insert_is_forbidden() {
        Exception ex = assertThrows(Exception.class, () ->
                jdbcTemplate.update("""
                        INSERT INTO ledger.ledger_balances (wallet_id, balance, frozen_balance)
                        VALUES (?, -50.00, 0.00)
                        """, UUID.randomUUID()));
        assertTrue(ex.getMessage().contains("Solde négatif interdit pour wallet"),
                "Message attendu: " + ex.getMessage());
    }
}
