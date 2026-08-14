package com.cauripay.ledger;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.PostgreSQLContainer;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Base des tests d'intégration (GOURSI-015c).
 *
 * <p>Deux modes :
 * <ul>
 *   <li>CI (Docker dispo) : PostgreSQL 16 + Redis 7 lancés par Testcontainers ;</li>
 *   <li>local : variables {@code LEDGER_TEST_DB_URL} / {@code LEDGER_TEST_REDIS_URL}
 *       (base dédiée {@code goursi_ledger_test} + redis local).</li>
 * </ul>
 */
@SpringBootTest
public abstract class AbstractLedgerIT {

    static final PostgreSQLContainer<?> POSTGRES;
    static final GenericContainer<?> REDIS;

    static {
        if (System.getenv("LEDGER_TEST_DB_URL") == null) {
            POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");
            POSTGRES.start();
        } else {
            POSTGRES = null;
        }
        if (System.getenv("LEDGER_TEST_REDIS_URL") == null) {
            REDIS = new GenericContainer<>("redis:7-alpine").withExposedPorts(6379);
            REDIS.start();
        } else {
            REDIS = null;
        }
    }

    @DynamicPropertySource
    static void dataSourceProperties(DynamicPropertyRegistry registry) {
        if (POSTGRES != null) {
            registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
            registry.add("spring.datasource.username", POSTGRES::getUsername);
            registry.add("spring.datasource.password", POSTGRES::getPassword);
        } else {
            registry.add("spring.datasource.url", () -> System.getenv("LEDGER_TEST_DB_URL"));
            registry.add("spring.datasource.username",
                () -> System.getenv().getOrDefault("LEDGER_TEST_DB_USER", "goursi"));
            registry.add("spring.datasource.password",
                () -> System.getenv().getOrDefault("LEDGER_TEST_DB_PASSWORD", "goursi_test_password"));
        }
        if (REDIS != null) {
            registry.add("spring.data.redis.url",
                () -> "redis://" + REDIS.getHost() + ":" + REDIS.getMappedPort(6379) + "/0");
        } else {
            registry.add("spring.data.redis.url", () -> System.getenv("LEDGER_TEST_REDIS_URL"));
            // L'index de base dans l'URL n'est PAS honoré par Spring Boot :
            // on le fixe explicitement pour isoler les tests de la base de dev.
            registry.add("spring.data.redis.database", () -> 2);
        }
        registry.add("ledger.service-key", () -> "it-service-key");
    }

    /**
     * Compte technique d'émission (capital) : seule source de création de monnaie.
     * Provisionné par une écriture unique (genesis) — toute autre transaction
     * du ledger doit être équilibrée (conservation de la monnaie).
     */
    protected static final UUID CAPITAL =
        UUID.fromString("00000000-0000-0000-0000-0000000000ca");

    @Autowired
    private com.cauripay.ledger.application.LedgerWriteService writeService;

    /**
     * Provisionne un wallet par un transfer équilibré depuis le compte capital.
     * L'invariant comptable {@code balance = Σ(entries)} est ainsi respecté
     * pour chaque wallet (condition du contrôle d'intégrité).
     */
    protected void fund(UUID walletId, String amount) {
        ensureCapital();
        writeService.transfer(new com.cauripay.ledger.application.command.TransferCommand(
            "fund-" + UUID.randomUUID(), UUID.randomUUID(), CAPITAL, walletId,
            new BigDecimal(amount), null, null, "provisioning", null));
    }

    /** Émission initiale du capital (idempotente via la clé fixe). */
    protected void ensureCapital() {
        writeService.credit(new com.cauripay.ledger.application.command.CreditCommand(
            "genesis-capital", UUID.randomUUID(), CAPITAL,
            new BigDecimal("1000000000.00"), "genesis"));
    }
}
