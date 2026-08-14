package com.goursi.ledger.application;

import com.goursi.ledger.domain.command.TransferCommand;
import com.goursi.ledger.domain.exception.InsufficientFundsException;
import com.goursi.ledger.domain.model.LedgerBalance;
import com.goursi.ledger.domain.repository.LedgerBalanceRepository;
import com.goursi.ledger.domain.repository.LedgerEntryRepository;
import com.goursi.ledger.domain.result.TransferResult;
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

import static org.junit.jupiter.api.Assertions.*;

/**
 * Garanties contractuelles du transferAtomic (spec §8.3) :
 * exactement 4 entrées, idempotence par clé, refus de découvert.
 */
@SpringBootTest
@Tag("integration")
@Testcontainers
@ActiveProfiles("test")
class LedgerWriteServiceTest {

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

    private UUID openWallet(BigDecimal initial) {
        UUID id = UUID.randomUUID();
        LedgerBalance b = LedgerBalance.open(id);
        if (initial != null) {
            b.credit(initial);
        }
        balanceRepository.save(b);
        return id;
    }

    private TransferCommand command(UUID from, UUID to, UUID fees, BigDecimal amount, UUID idemKey) {
        return new TransferCommand(idemKey, UUID.randomUUID(), from, to, amount,
                new BigDecimal("100.00"), fees, "Envoi P2P");
    }

    @Test
    void transferAtomic_creates_exactly_4_entries() {
        UUID from = openWallet(new BigDecimal("100000.00"));
        UUID to = openWallet(null);
        UUID fees = openWallet(null);
        long before = entryRepository.count();

        writeService.transferAtomic(command(from, to, fees, new BigDecimal("5000.00"), UUID.randomUUID()));

        assertEquals(before + 4, entryRepository.count());
    }

    @Test
    void transferAtomic_idempotent_same_key_no_duplicate() {
        UUID from = openWallet(new BigDecimal("100000.00"));
        UUID to = openWallet(null);
        UUID fees = openWallet(null);
        UUID idemKey = UUID.randomUUID();
        long before = entryRepository.count();

        TransferResult first = writeService.transferAtomic(command(from, to, fees, new BigDecimal("5000.00"), idemKey));
        TransferResult second = writeService.transferAtomic(command(from, to, fees, new BigDecimal("5000.00"), idemKey));

        assertEquals(first.transactionId(), second.transactionId());
        assertEquals(before + 4, entryRepository.count(), "Pas de doublon sur la même clé");
    }

    @Test
    void transferAtomic_throws_on_insufficient_funds() {
        UUID from = openWallet(new BigDecimal("1000.00"));
        UUID to = openWallet(null);
        UUID fees = openWallet(null);

        var cmd = command(from, to, fees, new BigDecimal("9999999.00"), UUID.randomUUID());
        assertThrows(InsufficientFundsException.class, () -> writeService.transferAtomic(cmd));
    }
}
