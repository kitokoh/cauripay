package com.goursi.ledger.api;

import com.goursi.ledger.AbstractLedgerIntegrationTest;
import com.goursi.ledger.domain.model.LedgerBalance;
import com.goursi.ledger.domain.repository.LedgerBalanceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * GOURSI-015c — contrat HTTP complet du contrôleur : 200/401/404/409/422.
 */
@AutoConfigureMockMvc
class LedgerControllerIntegrationTest extends AbstractLedgerIntegrationTest {

    private static final String SERVICE_KEY = "test-service-key";

    @Autowired MockMvc mvc;
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
            balanceRepository.save(new LedgerBalance(w));
        }
        LedgerBalance b = balanceRepository.findById(from).orElseThrow();
        b.credit(new BigDecimal("50000.00"));
        balanceRepository.save(b);
    }

    private String transferBody(String amount, String fee, String key) {
        return """
            {"idempotencyKey":"%s","transactionId":"%s","fromWalletId":"%s","toWalletId":"%s",
             "amount":%s,"feeAmount":%s,"platformFeesWalletId":"%s","description":"Envoi P2P"}
            """.formatted(key == null ? UUID.randomUUID() : key, UUID.randomUUID(), from, to, amount, fee, feeWallet);
    }

    @Test
    void sans_service_key_401() throws Exception {
        mvc.perform(post("/internal/ledger/transfer")
                .contentType(MediaType.APPLICATION_JSON)
                .content(transferBody("100.00", "0.00", null)))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.error.code").value("INVALID_SERVICE_KEY"));
    }

    @Test
    void transfer_valide_200_avec_4_entrees() throws Exception {
        mvc.perform(post("/internal/ledger/transfer")
                .header("X-Service-Key", SERVICE_KEY)
                .contentType(MediaType.APPLICATION_JSON)
                .content(transferBody("10000.00", "100.00", null)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.entries", hasSize(4)))
            .andExpect(jsonPath("$.fromBalance").value(39900.0))
            .andExpect(jsonPath("$.toBalance").value(10000.0));
    }

    @Test
    void montant_negatif_422() throws Exception {
        mvc.perform(post("/internal/ledger/transfer")
                .header("X-Service-Key", SERVICE_KEY)
                .contentType(MediaType.APPLICATION_JSON)
                .content(transferBody("-100.00", "0.00", null)))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    void solde_insuffisant_422() throws Exception {
        mvc.perform(post("/internal/ledger/transfer")
                .header("X-Service-Key", SERVICE_KEY)
                .contentType(MediaType.APPLICATION_JSON)
                .content(transferBody("999999.00", "0.00", null)))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.error.code").value("INSUFFICIENT_FUNDS"));
    }

    @Test
    void balance_exacte() throws Exception {
        mvc.perform(post("/internal/ledger/transfer")
                .header("X-Service-Key", SERVICE_KEY)
                .contentType(MediaType.APPLICATION_JSON)
                .content(transferBody("10000.00", "0.00", null)))
            .andExpect(status().isOk());

        mvc.perform(get("/internal/ledger/balance/{walletId}", from)
                .header("X-Service-Key", SERVICE_KEY))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.balance").value(40000.0))
            .andExpect(jsonPath("$.availableBalance").value(40000.0));
    }

    @Test
    void wallet_inconnu_404() throws Exception {
        mvc.perform(get("/internal/ledger/balance/{walletId}", UUID.randomUUID())
                .header("X-Service-Key", SERVICE_KEY))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.error.code").value("WALLET_NOT_FOUND"));
    }

    @Test
    void verify_endpoint_consistent() throws Exception {
        mvc.perform(post("/internal/ledger/transfer")
                .header("X-Service-Key", SERVICE_KEY)
                .contentType(MediaType.APPLICATION_JSON)
                .content(transferBody("10000.00", "100.00", null)))
            .andExpect(status().isOk());

        mvc.perform(post("/internal/ledger/verify")
                .header("X-Service-Key", SERVICE_KEY)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"walletId\":\"%s\"}".formatted(from)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.consistent").value(true))
            .andExpect(jsonPath("$.delta").value(0.0));
    }

    @Test
    void idempotence_409_payload_different() throws Exception {
        String key = UUID.randomUUID().toString();
        mvc.perform(post("/internal/ledger/transfer")
                .header("X-Service-Key", SERVICE_KEY)
                .contentType(MediaType.APPLICATION_JSON)
                .content(transferBody("10000.00", "0.00", key)))
            .andExpect(status().isOk());

        mvc.perform(post("/internal/ledger/transfer")
                .header("X-Service-Key", SERVICE_KEY)
                .contentType(MediaType.APPLICATION_JSON)
                .content(transferBody("20000.00", "0.00", key)))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.error.code").value("IDEMPOTENCY_CONFLICT"));
    }

    @Test
    void actuator_health_sans_cle_200() throws Exception {
        mvc.perform(get("/actuator/health"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("UP"));
    }
}
