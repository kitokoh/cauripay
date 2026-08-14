package com.goursi.ledger.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.goursi.ledger.domain.command.TransferCommand;
import com.goursi.ledger.domain.exception.InsufficientFundsException;
import com.goursi.ledger.domain.model.EntryType;
import com.goursi.ledger.domain.model.LedgerBalance;
import com.goursi.ledger.domain.result.TransferResult;
import com.goursi.ledger.infrastructure.persistence.LedgerBalanceRepository;
import com.goursi.ledger.infrastructure.persistence.LedgerEntryRepository;
import java.math.BigDecimal;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.containers.RabbitMQContainer;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Preuves contractuelles du transfer (spec §8.3) :
 * 4 entries · idempotence · refus de découvert · concurrence (10 threads) ·
 * immutabilité en base · équilibre comptable · événements après commit.
 * Nécessite Docker — exécuté par la CI (profil integration).
 */
@SpringBootTest
@Testcontainers
@Tag("integration")
class LedgerWriteServiceIT {

  @Container
  static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
      .withDatabaseName("ledger_test");

  @Container
  static GenericContainer<?> redis = new GenericContainer<>("redis:7-alpine")
      .withExposedPorts(6379);

  @Container
  static RabbitMQContainer rabbit = new RabbitMQContainer("rabbitmq:3-management-alpine");

  @DynamicPropertySource
  static void props(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", postgres::getJdbcUrl);
    registry.add("spring.datasource.username", postgres::getUsername);
    registry.add("spring.datasource.password", postgres::getPassword);
    registry.add("spring.data.redis.url", () -> "redis://" + redis.getHost() + ":" + redis.getMappedPort(6379));
    registry.add("spring.rabbitmq.addresses", rabbit::getAmqpUrl);
    registry.add("goursi.internal.service-key", () -> "test-service-key");
  }

  @Autowired private LedgerWriteService writeService;
  @Autowired private LedgerReadService readService;
  @Autowired private LedgerVerifyService verifyService;
  @Autowired private LedgerEntryRepository entryRepository;
  @Autowired private LedgerBalanceRepository balanceRepository;
  @Autowired private JdbcTemplate jdbc;

  private UUID newWallet(BigDecimal initial) {
    UUID id = UUID.randomUUID();
    balanceRepository.save(new LedgerBalance(id, initial));
    // L'invariant vérifié par LedgerVerifyService est : solde stocké == SUM(entries).
    // Un wallet est toujours créé à 0 en production (ADR-003) : tout solde initial de
    // fixture DOIT être matérialisé par une écriture CREDIT, sinon le contrôle COBAC
    // signale un écart légitime.
    if (initial.compareTo(BigDecimal.ZERO) > 0) {
      jdbc.update("""
              INSERT INTO ledger.ledger_entries
                  (transaction_id, wallet_id, direction, amount, balance_before, balance_after, entry_type, description)
              VALUES (?, ?, 'CREDIT', ?, 0, ?, 'PRINCIPAL', 'seed fixture')
              """,
          UUID.randomUUID(), id, initial, initial);
    }
    return id;
  }

  @Test
  void transferAtomic_creates_exactly_4_entries() {
    UUID from = newWallet(new BigDecimal("100000"));
    UUID to = newWallet(new BigDecimal("0"));
    UUID fees = newWallet(new BigDecimal("0"));
    long before = entryRepository.count();

    TransferResult result = writeService.transferAtomic(
        new TransferCommand(UUID.randomUUID(), UUID.randomUUID(), from, to,
            new BigDecimal("10000"), new BigDecimal("100"), fees, "Test"));

    assertThat(entryRepository.count()).isEqualTo(before + 4);
    assertThat(result.entryIds()).hasSize(4);
    assertThat(readService.getBalance(from).balance()).isEqualByComparingTo("89900.00");
    assertThat(readService.getBalance(to).balance()).isEqualByComparingTo("10000.00");
    assertThat(readService.getBalance(fees).balance()).isEqualByComparingTo("100.00");
  }

  @Test
  void transferAtomic_idempotent_same_key_no_duplicate() {
    UUID from = newWallet(new BigDecimal("100000"));
    UUID to = newWallet(new BigDecimal("0"));
    UUID fees = newWallet(new BigDecimal("0"));
    UUID idemKey = UUID.randomUUID();
    UUID txId = UUID.randomUUID();
    long before = entryRepository.count();

    TransferCommand cmd = new TransferCommand(idemKey, txId, from, to,
        new BigDecimal("10000"), new BigDecimal("100"), fees, "Test");
    TransferResult first = writeService.transferAtomic(cmd);
    TransferResult second = writeService.transferAtomic(cmd);

    assertThat(second.transactionId()).isEqualTo(first.transactionId());
    // pas de doublon : toujours +4, pas +8
    assertThat(entryRepository.count()).isEqualTo(before + 4);
    assertThat(entryRepository.countByTransactionId(txId)).isEqualTo(4);
  }

  @Test
  void transferAtomic_throws_on_insufficient_funds() {
    UUID from = newWallet(new BigDecimal("1000"));
    UUID to = newWallet(new BigDecimal("0"));
    UUID fees = newWallet(new BigDecimal("0"));
    long before = entryRepository.count();

    assertThatThrownBy(() -> writeService.transferAtomic(
        new TransferCommand(UUID.randomUUID(), UUID.randomUUID(), from, to,
            new BigDecimal("9999999"), new BigDecimal("0"), fees, "Test")))
        .isInstanceOf(InsufficientFundsException.class)
        .hasMessageContaining("Solde insuffisant");

    // rollback total : aucune écriture
    assertThat(entryRepository.count()).isEqualTo(before);
    assertThat(readService.getBalance(from).balance()).isEqualByComparingTo("1000.00");
  }

  @Test
  void concurrency_10_threads_no_balance_corruption() throws Exception {
    UUID from = newWallet(new BigDecimal("100000"));
    UUID to = newWallet(new BigDecimal("0"));
    UUID fees = newWallet(new BigDecimal("0"));
    long before = entryRepository.count();

    var pool = Executors.newFixedThreadPool(10);
    List<Future<TransferResult>> futures = new ArrayList<>();
    for (int i = 0; i < 10; i++) {
      futures.add(pool.submit(() -> writeService.transferAtomic(
          new TransferCommand(UUID.randomUUID(), UUID.randomUUID(), from, to,
              new BigDecimal("10000"), new BigDecimal("100"), fees, "Concurrence"))));
    }
    int success = 0;
    for (Future<TransferResult> f : futures) {
      try {
        f.get(30, TimeUnit.SECONDS);
        success++;
      } catch (Exception ignored) {
        // OptimisticLock / retry attendu — documenté : l'appelant DOIT retenter
      }
    }
    pool.shutdown();

    // AUCUN double débit : solde = 100000 - 10100 × réussites
    BigDecimal expected = new BigDecimal("100000")
        .subtract(new BigDecimal("10100").multiply(BigDecimal.valueOf(success)));
    assertThat(readService.getBalance(from).balance()).isEqualByComparingTo(expected);
    assertThat(entryRepository.count()).isEqualTo(before + 4L * success);
    assertThat(readService.getBalance(to).balance())
        .isEqualByComparingTo(new BigDecimal("10000").multiply(BigDecimal.valueOf(success)));
    // Note : certains échecs (conflits de concurrence) sont NORMAUX et doivent être retentés par l'appelant.
  }

  @Test
  void immutability_trigger_blocks_update_and_delete() {
    UUID from = newWallet(new BigDecimal("100000"));
    UUID to = newWallet(new BigDecimal("0"));
    UUID fees = newWallet(new BigDecimal("0"));
    TransferResult result = writeService.transferAtomic(
        new TransferCommand(UUID.randomUUID(), UUID.randomUUID(), from, to,
            new BigDecimal("1000"), new BigDecimal("10"), fees, "Trigger test"));
    UUID entryId = result.entryIds().get(0);

    assertThatThrownBy(() -> jdbc.update(
        "UPDATE ledger.ledger_entries SET description = 'X' WHERE id = ?", entryId))
        .hasMessageContaining("Opération interdite");

    assertThatThrownBy(() -> jdbc.update(
        "DELETE FROM ledger.ledger_entries WHERE id = ?", entryId))
        .hasMessageContaining("Opération interdite");
  }

  @Test
  void negative_balance_trigger_blocks() {
    UUID wallet = UUID.randomUUID();
    assertThatThrownBy(() -> jdbc.update(
        "INSERT INTO ledger.ledger_balances (wallet_id, balance, frozen_balance, version) VALUES (?, -5, 0, 0)",
        wallet))
        .hasMessageContaining("Solde négatif interdit");
  }

  @Test
  void verify_all_balanced_after_transfers() {
    UUID from = newWallet(new BigDecimal("50000"));
    UUID to = newWallet(new BigDecimal("0"));
    UUID fees = newWallet(new BigDecimal("0"));
    writeService.transferAtomic(new TransferCommand(
        UUID.randomUUID(), UUID.randomUUID(), from, to,
        new BigDecimal("5000"), new BigDecimal("50"), fees, "Verify test"));

    LedgerVerifyService.VerifyReport report = verifyService.verifyAll();

    assertThat(report.balanced()).isTrue();
    assertThat(report.discrepancies()).isEmpty();
  }

  @Test
  void reversal_restores_net_zero_and_is_idempotent() {
    UUID from = newWallet(new BigDecimal("50000"));
    UUID to = newWallet(new BigDecimal("0"));
    UUID fees = newWallet(new BigDecimal("0"));
    UUID txId = UUID.randomUUID();
    writeService.transferAtomic(new TransferCommand(
        UUID.randomUUID(), txId, from, to,
        new BigDecimal("5000"), new BigDecimal("50"), fees, "Reverse test"));

    UUID reversalKey = UUID.randomUUID();
    writeService.reverse(txId, "Erreur opérateur", reversalKey);
    // idempotent
    writeService.reverse(txId, "Erreur opérateur", reversalKey);

    // somme nette = 0 pour chaque wallet concerné
    assertThat(readService.getBalance(from).balance()).isEqualByComparingTo("50000.00");
    assertThat(readService.getBalance(to).balance()).isEqualByComparingTo("0.00");
    assertThat(readService.getBalance(fees).balance()).isEqualByComparingTo("0.00");
    // les écritures REVERSAL existent
    assertThat(entryRepository.existsByTransactionIdAndEntryType(txId, EntryType.REVERSAL)).isTrue();
  }
}
