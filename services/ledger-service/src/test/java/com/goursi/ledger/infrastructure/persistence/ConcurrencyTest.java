package com.goursi.ledger.infrastructure.persistence;

import com.goursi.ledger.domain.command.TransferCommand;
import com.goursi.ledger.domain.model.LedgerBalance;
import com.goursi.ledger.domain.repository.LedgerBalanceRepository;
import com.goursi.ledger.domain.repository.LedgerEntryRepository;
import com.goursi.ledger.application.LedgerWriteService;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Test de concurrence (spec §8.3) : 10 transferts simultanés depuis le même wallet
 * → aucun double débit, solde final exact. Déterministe.
 */
@SpringBootTest
@Tag("integration")
@Testcontainers
@ActiveProfiles("test")
class ConcurrencyTest {

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
    private LedgerWriteService writeService;
    @Autowired
    private LedgerBalanceRepository balanceRepository;
    @Autowired
    private LedgerEntryRepository entryRepository;

    @Test
    void ten_parallel_transfers_never_corrupt_balance() throws Exception {
        UUID from = UUID.randomUUID();
        UUID to = UUID.randomUUID();
        UUID fees = UUID.randomUUID();

        // Initialisation : solde connu
        LedgerBalance fromBalance = LedgerBalance.open(from);
        fromBalance.credit(new BigDecimal("1000000.00"));
        balanceRepository.save(fromBalance);
        balanceRepository.save(LedgerBalance.open(to));
        balanceRepository.save(LedgerBalance.open(fees));

        int threads = 10;
        BigDecimal amount = new BigDecimal("10000.00");
        BigDecimal fee = new BigDecimal("100.00");

        ExecutorService pool = Executors.newFixedThreadPool(threads);
        AtomicInteger successes = new AtomicInteger(0);
        AtomicInteger conflicts = new AtomicInteger(0);

        for (int i = 0; i < threads; i++) {
            pool.submit(() -> {
                try {
                    writeService.transferAtomic(new TransferCommand(
                            UUID.randomUUID(), UUID.randomUUID(), from, to,
                            amount, fee, fees, "Test concurrence"));
                    successes.incrementAndGet();
                } catch (org.springframework.dao.OptimisticLockingFailureException e) {
                    // Conflit attendu sous concurrence — retentable
                    conflicts.incrementAndGet();
                } catch (Exception e) {
                    // autre échec (ex: solde) — on ne devrait pas en avoir ici
                    throw new RuntimeException(e);
                }
            });
        }
        pool.shutdown();
        assertTrue(pool.awaitTermination(60, TimeUnit.SECONDS));

        int ok = successes.get();
        long entries = entryRepository.count();
        LedgerBalance after = balanceRepository.findById(from).orElseThrow();

        // Solde final : INITIAL - (total débité par réussite) — AUCUN double débit
        BigDecimal expected = new BigDecimal("1000000.00")
                .subtract(amount.add(fee).multiply(BigDecimal.valueOf(ok)));
        assertEquals(expected, after.getBalance());
        // 4 entrées par transfert réussi
        assertEquals(4L * ok, entries);
    }
}
