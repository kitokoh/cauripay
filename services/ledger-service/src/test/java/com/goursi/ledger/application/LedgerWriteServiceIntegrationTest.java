package com.goursi.ledger.application;

import com.goursi.ledger.AbstractLedgerIntegrationTest;
import com.goursi.ledger.domain.command.CreditCommand;
import com.goursi.ledger.domain.command.DebitCommand;
import com.goursi.ledger.domain.command.ReverseCommand;
import com.goursi.ledger.domain.command.TransferCommand;
import com.goursi.ledger.domain.exception.IdempotencyConflictException;
import com.goursi.ledger.domain.exception.InsufficientFundsException;
import com.goursi.ledger.domain.exception.WalletNotFoundException;
import com.goursi.ledger.domain.model.LedgerBalance;
import com.goursi.ledger.domain.model.LedgerEntry;
import com.goursi.ledger.domain.model.LedgerEntry.EntryType;
import com.goursi.ledger.domain.repository.LedgerBalanceRepository;
import com.goursi.ledger.domain.repository.LedgerEntryRepository;
import com.goursi.ledger.domain.result.TransferResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.Executors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * GOURSI-014b/f/g — les garanties contractuelles du cœur comptable :
 * exactement 4 écritures, idempotence par clé, refus de découvert, intégrité
 * sous concurrence (10 threads simultanés).
 */
class LedgerWriteServiceIntegrationTest extends AbstractLedgerIntegrationTest {

    @Autowired LedgerWriteService writeService;
    @Autowired LedgerBalanceRepository balanceRepository;
    @Autowired LedgerEntryRepository entryRepository;
    @Autowired StringRedisTemplate redis;

    UUID from;
    UUID to;
    UUID feeWallet;

    @BeforeEach
    void seed() {
        redis.getConnectionFactory().getConnection().serverCommands().flushDb();
        from = UUID.randomUUID();
        to = UUID.randomUUID();
        feeWallet = UUID.randomUUID();
        balanceRepository.save(new LedgerBalance(from));
        balanceRepository.save(new LedgerBalance(to));
        balanceRepository.save(new LedgerBalance(feeWallet));
    }

    private void fund(UUID walletId, String amount) {
        LedgerBalance b = balanceRepository.findById(walletId).orElseThrow();
        b.credit(new BigDecimal(amount));
        balanceRepository.save(b);
    }

    private TransferCommand transfer(String amount, String fee, UUID key) {
        return new TransferCommand(key, UUID.randomUUID(), from, to,
            new BigDecimal(amount), new BigDecimal(fee), feeWallet, "Envoi P2P");
    }

    @Test
    void transferAtomic_cree_exactement_4_ecritures() {
        fund(from, "50000.00");
        long before = entryRepository.count();

        TransferResult r = writeService.transferAtomic(transfer("10000.00", "100.00", UUID.randomUUID()));

        assertThat(entryRepository.count() - before).isEqualTo(4);
        assertThat(r.entries()).hasSize(4);
        assertThat(r.fromBalance()).isEqualByComparingTo("39900.00");
        assertThat(r.toBalance()).isEqualByComparingTo("10000.00");
        // toutes les écritures portent le même transactionId
        assertThat(r.entries()).allSatisfy(e -> assertThat(e.getTransactionId()).isEqualTo(r.transactionId()));
    }

    @Test
    void transferAtomic_idempotent_meme_cle_pas_de_doublon() {
        fund(from, "50000.00");
        UUID key = UUID.randomUUID();
        long before = entryRepository.count();

        TransferResult first = writeService.transferAtomic(transfer("10000.00", "100.00", key));
        TransferResult second = writeService.transferAtomic(transfer("10000.00", "100.00", key));

        assertThat(second.transactionId()).isEqualTo(first.transactionId());
        assertThat(entryRepository.count() - before).isEqualTo(4); // aucune écriture en double
    }

    @Test
    void transferAtomic_meme_cle_payload_different_409() {
        fund(from, "50000.00");
        UUID key = UUID.randomUUID();
        writeService.transferAtomic(transfer("10000.00", "100.00", key));
        assertThatThrownBy(() -> writeService.transferAtomic(transfer("20000.00", "100.00", key)))
            .isInstanceOf(IdempotencyConflictException.class);
    }

    @Test
    void transferAtomic_solde_insuffisant_refuse_sans_ecriture() {
        fund(from, "100.00");
        long before = entryRepository.count();
        assertThatThrownBy(() -> writeService.transferAtomic(transfer("9999.00", "100.00", UUID.randomUUID())))
            .isInstanceOf(InsufficientFundsException.class);
        assertThat(entryRepository.count()).isEqualTo(before);
        assertThat(balanceRepository.findById(from).orElseThrow().getBalance()).isEqualByComparingTo("100.00");
    }

    @Test
    void transferAtomic_wallet_inconnu_404() {
        UUID ghost = UUID.randomUUID();
        assertThatThrownBy(() -> writeService.transferAtomic(
                new TransferCommand(UUID.randomUUID(), UUID.randomUUID(), ghost, to, new BigDecimal("10.00"), BigDecimal.ZERO, feeWallet, null)))
            .isInstanceOf(WalletNotFoundException.class);
    }

    @Test
    void credit_debit_unitaires() {
        var credit = writeService.credit(new CreditCommand(UUID.randomUUID(), from, new BigDecimal("500.00"),
            UUID.randomUUID(), EntryType.PRINCIPAL, "Cash-in"));
        assertThat(credit.balanceAfter()).isEqualByComparingTo("500.00");

        var debit = writeService.debit(new DebitCommand(UUID.randomUUID(), from, new BigDecimal("200.00"),
            UUID.randomUUID(), EntryType.PRINCIPAL, "Cash-out"));
        assertThat(debit.balanceAfter()).isEqualByComparingTo("300.00");

        // débit sans fonds
        assertThatThrownBy(() -> writeService.debit(new DebitCommand(UUID.randomUUID(), from, new BigDecimal("99999.00"),
            UUID.randomUUID(), EntryType.PRINCIPAL, null)))
            .isInstanceOf(InsufficientFundsException.class);
    }

    @Test
    void reverse_ecritures_miroir_et_soldes_restaures() {
        fund(from, "50000.00");
        TransferResult r = writeService.transferAtomic(transfer("10000.00", "100.00", UUID.randomUUID()));
        long before = entryRepository.count();

        writeService.reverse(new ReverseCommand(UUID.randomUUID(), r.transactionId(), "Annulation client"));

        assertThat(entryRepository.count() - before).isEqualTo(4); // 4 miroirs REVERSAL
        assertThat(balanceRepository.findById(from).orElseThrow().getBalance()).isEqualByComparingTo("50000.00");
        assertThat(balanceRepository.findById(to).orElseThrow().getBalance()).isEqualByComparingTo("0.00");
        assertThat(entryRepository.findByTransactionId(r.transactionId())).hasSize(4);
    }

    @Test
    void concurrence_10_transferts_pas_de_corruption_de_solde() throws Exception {
        fund(from, "100000.00");
        long entriesBefore = entryRepository.count();

        var pool = Executors.newFixedThreadPool(10);
        List<Callable<String>> tasks = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            UUID key = UUID.randomUUID();
            tasks.add(() -> {
                try {
                    writeService.transferAtomic(transfer("10000.00", "100.00", key));
                    return "ok";
                } catch (Exception e) {
                    return "fail:" + e.getClass().getSimpleName();
                }
            });
        }
        var results = pool.invokeAll(tasks);
        pool.shutdown();

        long successes = results.stream()
            .map(f -> {
                try { return f.get(); } catch (Exception e) { return "fail"; }
            })
            .filter(s -> s.equals("ok"))
            .count();

        // Invariant anti-corruption : AUCUN double débit, peu importe le nb de réussites.
        BigDecimal expected = new BigDecimal("100000.00").subtract(new BigDecimal("10000.00").multiply(BigDecimal.valueOf(successes)));
        assertThat(balanceRepository.findById(from).orElseThrow().getBalance()).isEqualByComparingTo(expected);
        assertThat(balanceRepository.findById(to).orElseThrow().getBalance())
            .isEqualByComparingTo(new BigDecimal("10000.00").multiply(BigDecimal.valueOf(successes)));
        assertThat(entryRepository.count() - entriesBefore).isEqualTo(4 * successes);
        assertThat(successes).isGreaterThanOrEqualTo(1);
    }

    @Test
    void verify_est_coherent_apres_transfert() {
        fund(from, "50000.00");
        writeService.transferAtomic(transfer("10000.00", "0.00", UUID.randomUUID()));
        // cohérence vérifiée en détail dans LedgerVerifyServiceIntegrationTest
        assertThat(balanceRepository.findById(from).orElseThrow().getBalance()).isEqualByComparingTo("40000.00");
    }
}
