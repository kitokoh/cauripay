package com.goursi.ledger.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.goursi.ledger.domain.model.LedgerBalance;
import com.goursi.ledger.domain.repository.LedgerBalanceRepository;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Contrat HTTP complet du LedgerController (spec §8.4) : 200 / 401 / 404 / 409 / 422.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Tag("integration")
@Testcontainers
@ActiveProfiles("test")
class LedgerControllerIntegrationTest {

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
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private LedgerBalanceRepository balanceRepository;

    private UUID openWallet(BigDecimal initial) {
        UUID id = UUID.randomUUID();
        LedgerBalance b = LedgerBalance.open(id);
        if (initial != null) b.credit(initial);
        balanceRepository.save(b);
        return id;
    }

    @Test
    void transfer_valid_returns_200() throws Exception {
        UUID from = openWallet(new BigDecimal("100000.00"));
        UUID to = openWallet(null);
        UUID fees = openWallet(null);

        Map<String, Object> body = Map.of(
                "idempotencyKey", UUID.randomUUID(),
                "transactionId", UUID.randomUUID(),
                "fromWalletId", from,
                "toWalletId", to,
                "amount", 5000.00,
                "feeAmount", 100.00,
                "platformFeesWalletId", fees);

        mockMvc.perform(post("/internal/ledger/transfer")
                        .header("X-Service-Key", "test-secret-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.entries.length()").value(4))
                .andExpect(jsonPath("$.entries[0].amount").value(5000.00));
    }

    @Test
    void transfer_without_service_key_returns_401() throws Exception {
        UUID from = openWallet(new BigDecimal("100000.00"));
        UUID to = openWallet(null);
        UUID fees = openWallet(null);

        Map<String, Object> body = Map.of(
                "idempotencyKey", UUID.randomUUID(),
                "transactionId", UUID.randomUUID(),
                "fromWalletId", from,
                "toWalletId", to,
                "amount", 5000.00,
                "feeAmount", 100.00,
                "platformFeesWalletId", fees);

        mockMvc.perform(post("/internal/ledger/transfer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("INVALID_SERVICE_KEY"));
    }

    @Test
    void transfer_negative_amount_returns_422() throws Exception {
        UUID from = openWallet(new BigDecimal("100000.00"));
        UUID to = openWallet(null);
        UUID fees = openWallet(null);

        Map<String, Object> body = Map.of(
                "idempotencyKey", UUID.randomUUID(),
                "transactionId", UUID.randomUUID(),
                "fromWalletId", from,
                "toWalletId", to,
                "amount", -500.00,
                "feeAmount", 100.00,
                "platformFeesWalletId", fees);

        mockMvc.perform(post("/internal/ledger/transfer")
                        .header("X-Service-Key", "test-secret-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void transfer_insufficient_funds_returns_422() throws Exception {
        UUID from = openWallet(new BigDecimal("100.00"));
        UUID to = openWallet(null);
        UUID fees = openWallet(null);

        Map<String, Object> body = Map.of(
                "idempotencyKey", UUID.randomUUID(),
                "transactionId", UUID.randomUUID(),
                "fromWalletId", from,
                "toWalletId", to,
                "amount", 999999.00,
                "feeAmount", 100.00,
                "platformFeesWalletId", fees);

        mockMvc.perform(post("/internal/ledger/transfer")
                        .header("X-Service-Key", "test-secret-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.code").value("INSUFFICIENT_FUNDS"));
    }

    @Test
    void balance_returns_exact_values() throws Exception {
        UUID wallet = openWallet(new BigDecimal("12345.67"));

        mockMvc.perform(get("/internal/ledger/balance/" + wallet)
                        .header("X-Service-Key", "test-secret-key"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.balance").value(12345.67))
                .andExpect(jsonPath("$.availableBalance").value(12345.67));
    }

    @Test
    void balance_unknown_wallet_returns_404() throws Exception {
        mockMvc.perform(get("/internal/ledger/balance/" + UUID.randomUUID())
                        .header("X-Service-Key", "test-secret-key"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("WALLET_NOT_FOUND"));
    }
}
