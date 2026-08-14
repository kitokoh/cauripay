package com.goursi.ledger.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.goursi.ledger.domain.command.TransferCommand;
import com.goursi.ledger.domain.exception.InsufficientFundsException;
import com.goursi.ledger.domain.model.LedgerBalance;
import com.goursi.ledger.domain.result.TransferResult;
import com.goursi.ledger.infrastructure.messaging.LedgerEventPublisher;
import com.goursi.ledger.infrastructure.metrics.LedgerMetrics;
import com.goursi.ledger.infrastructure.persistence.LedgerBalanceRepository;
import com.goursi.ledger.infrastructure.persistence.LedgerEntryRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** Tests unitaires de l'orchestration (repos mockés). L'intégration réelle : *IT (Testcontainers). */
@ExtendWith(MockitoExtension.class)
class LedgerWriteServiceTest {

  @Mock private LedgerEntryRepository entryRepository;
  @Mock private LedgerBalanceRepository balanceRepository;
  @Mock private IdempotencyService idempotencyService;
  @Mock private LedgerEventPublisher eventPublisher;
  @Mock private LedgerMetrics metrics;

  private LedgerWriteService service;

  private final UUID txId = UUID.randomUUID();
  private final UUID fromId = UUID.randomUUID();
  private final UUID toId = UUID.randomUUID();
  private final UUID feesId = UUID.randomUUID();

  @BeforeEach
  void setUp() {
    service = new LedgerWriteService(entryRepository, balanceRepository, idempotencyService, eventPublisher, metrics);
    org.mockito.Mockito.lenient().when(idempotencyService.getCached(any(), any())).thenReturn(Optional.empty());
    org.mockito.Mockito.lenient().when(idempotencyService.claim(any(), any())).thenReturn(IdempotencyService.Claim.OK);
  }

  private TransferCommand cmd(BigDecimal amount, BigDecimal fee) {
    return new TransferCommand(UUID.randomUUID(), txId, fromId, toId, amount, fee, feesId, "Test");
  }

  @Test
  void transferAtomic_ecrit_exactement_4_entries() {
    LedgerBalance from = new LedgerBalance(fromId, new BigDecimal("100000"));
    LedgerBalance to = new LedgerBalance(toId, new BigDecimal("0"));
    LedgerBalance fees = new LedgerBalance(feesId, new BigDecimal("0"));
    when(balanceRepository.findByWalletIdForUpdate(fromId)).thenReturn(Optional.of(from));
    when(balanceRepository.findByWalletIdForUpdate(toId)).thenReturn(Optional.of(to));
    when(balanceRepository.findByWalletIdForUpdate(feesId)).thenReturn(Optional.of(fees));

    TransferResult result = service.transferAtomic(cmd(new BigDecimal("10000"), new BigDecimal("100")));

    // 4 écritures capturées
    org.mockito.ArgumentCaptor<List<com.goursi.ledger.domain.model.LedgerEntry>> captor =
        org.mockito.ArgumentCaptor.forClass(List.class);
    verify(entryRepository).saveAll(captor.capture());
    assertThat(captor.getValue()).hasSize(4);

    // soldes finaux exacts : from -= 10100, to += 10000, fees += 100
    assertThat(result.fromBalance()).isEqualByComparingTo("89900.00");
    assertThat(result.toBalance()).isEqualByComparingTo("10000.00");
    assertThat(result.platformFeesBalance()).isEqualByComparingTo("100.00");
    assertThat(result.entryIds()).hasSize(4);

    verify(idempotencyService).storeResult(any(), any(), any());
    verify(eventPublisher).publishCompleted(txId, "TRANSFER", new BigDecimal("10000"), List.of(fromId, toId));
  }

  @Test
  void transferAtomic_sans_frais_ecrit_2_entries() {
    LedgerBalance from = new LedgerBalance(fromId, new BigDecimal("100000"));
    LedgerBalance to = new LedgerBalance(toId, new BigDecimal("0"));
    when(balanceRepository.findByWalletIdForUpdate(fromId)).thenReturn(Optional.of(from));
    when(balanceRepository.findByWalletIdForUpdate(toId)).thenReturn(Optional.of(to));

    service.transferAtomic(cmd(new BigDecimal("10000"), BigDecimal.ZERO));

    org.mockito.ArgumentCaptor<List<com.goursi.ledger.domain.model.LedgerEntry>> captor =
        org.mockito.ArgumentCaptor.forClass(List.class);
    verify(entryRepository).saveAll(captor.capture());
    assertThat(captor.getValue()).hasSize(2);
  }

  @Test
  void solde_insuffisant_leve_et_rollback_total() {
    LedgerBalance from = new LedgerBalance(fromId, new BigDecimal("100"));
    LedgerBalance to = new LedgerBalance(toId, new BigDecimal("0"));
    LedgerBalance fees = new LedgerBalance(feesId, new BigDecimal("0"));
    when(balanceRepository.findByWalletIdForUpdate(fromId)).thenReturn(Optional.of(from));
    when(balanceRepository.findByWalletIdForUpdate(toId)).thenReturn(Optional.of(to));
    when(balanceRepository.findByWalletIdForUpdate(feesId)).thenReturn(Optional.of(fees));

    assertThatThrownBy(() -> service.transferAtomic(cmd(new BigDecimal("100"), new BigDecimal("1"))))
        .isInstanceOf(InsufficientFundsException.class);

    // AUCUNE écriture ni sauvegarde
    verify(entryRepository, never()).saveAll(anyList());
    verify(balanceRepository, never()).saveAll(anyList());
    verify(idempotencyService).release(any());
  }

  @Test
  void meme_cle_rejouee_renvoie_le_resultat_cache() {
    TransferCommand cmd = cmd(new BigDecimal("10000"), new BigDecimal("100"));
    TransferResult cached = new TransferResult(
        txId, List.of(), new BigDecimal("89900"), new BigDecimal("10000"), new BigDecimal("100"));
    when(idempotencyService.getCached(any(), any())).thenReturn(Optional.of(cached));

    TransferResult result = service.transferAtomic(cmd);

    assertThat(result.transactionId()).isEqualTo(txId);
    // aucun accès aux balances
    verify(balanceRepository, never()).findByWalletIdForUpdate(any());
    verify(entryRepository, never()).saveAll(anyList());
  }
}
