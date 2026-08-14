package com.goursi.ledger.application;

import com.goursi.ledger.AbstractLedgerIntegrationTest;
import com.goursi.ledger.domain.command.TransferCommand;
import com.goursi.ledger.domain.model.LedgerBalance;
import com.goursi.ledger.domain.repository.LedgerBalanceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** GOURSI-016c — l'équilibre comptable : SUM(credit)-SUM(debit) == solde stocké. */
class LedgerVerifyServiceIntegrationTest extends AbstractLedgerIntegrationTest {

    @Autowired LedgerWriteService writeService;
    @Autowired LedgerVerifyService verifyService;
    @Autowired LedgerBalanceRepository balanceRepository;
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
        for (UUID w : List.of(from, to, feeWallet)) {
            LedgerBalance b = new LedgerBalance(w);
            balanceRepository.save(b);
        }
        balanceRepository.findById(from).orElseThrow().credit(new BigDecimal("50000.00"));
        balanceRepository.save(balanceRepository.findById(from).orElseThrow());
    }

    @Test
    void wallet_sain_consistent_true_delta_zero() {
        writeService.transferAtomic(new TransferCommand(UUID.randomUUID(), UUID.randomUUID(),
            from, to, new BigDecimal("10000.00"), new BigDecimal("100.00"), feeWallet, "P2P"));

        LedgerVerifyService.Verification v = verifyService.verify(from);
        assertThat(v.consistent()).isTrue();
        assertThat(v.delta()).isEqualByComparingTo("0.00");
        assertThat(v.stored()).isEqualByComparingTo("39900.00");
    }

    @Test
    void verification_par_wallet_apres_credit_et_debit() {
        writeService.credit(new com.goursi.ledger.domain.command.CreditCommand(UUID.randomUUID(), to,
            new BigDecimal("250.00"), UUID.randomUUID(), com.goursi.ledger.domain.model.LedgerEntry.EntryType.PRINCIPAL, "Cash-in"));

        assertThat(verifyService.verify(to).consistent()).isTrue();
        assertThat(verifyService.verify(to).stored()).isEqualByComparingTo("250.00");
    }
}
