package com.cauripay.ledger.web;

import com.cauripay.ledger.AbstractLedgerIT;
import com.cauripay.ledger.infrastructure.persistence.LedgerBalanceJpaRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests MockMvc de l'API interne (GOURSI-015c) : 401 sans clé, 200 transfer,
 * 422 insuffisance, lecture de solde, 400 validation.
 */
@AutoConfigureMockMvc
class LedgerControllerIT extends AbstractLedgerIT {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private LedgerBalanceJpaRepository balanceRepository;

    private UUID from;
    private UUID to;
    private UUID fees;

    @BeforeEach
    void seed() {
        from = UUID.randomUUID();
        to = UUID.randomUUID();
        fees = UUID.randomUUID();
        // `from` est provisionné par un crédit comptable ; `to` et `fees`
        // sont auto-provisionnés au premier contact (transfer).
        fund(from, "1000.00");
    }

    @Test
    void rejectsRequestWithoutServiceKey() throws Exception {
        mockMvc.perform(get("/internal/ledger/wallets/{id}/balance", from))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.error.code").value("INVALID_SERVICE_KEY"));
    }

    @Test
    void rejectsRequestWithWrongServiceKey() throws Exception {
        mockMvc.perform(get("/internal/ledger/wallets/{id}/balance", from)
                .header("X-Service-Key", "wrong-key"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void transferReturns200WithFourEntries() throws Exception {
        final UUID transactionId = UUID.randomUUID();
        final Map<String, Object> body = Map.of(
            "idempotencyKey", "http-xfer-" + UUID.randomUUID(),
            "transactionId", transactionId.toString(),
            "fromWalletId", from.toString(),
            "toWalletId", to.toString(),
            "amount", "100.00",
            "feeAmount", "1.90",
            "platformFeesWalletId", fees.toString(),
            "description", "P2P");

        mockMvc.perform(post("/internal/ledger/transfer")
                .header("X-Service-Key", "it-service-key")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.ledgerEntryIds.length()").value(4));

        mockMvc.perform(get("/internal/ledger/wallets/{id}/balance", from)
                .header("X-Service-Key", "it-service-key"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.balance").value("898.10"));
    }

    @Test
    void insufficientFundsReturns422() throws Exception {
        final Map<String, Object> body = Map.of(
            "idempotencyKey", "http-insuf-" + UUID.randomUUID(),
            "transactionId", UUID.randomUUID().toString(),
            "fromWalletId", from.toString(),
            "toWalletId", to.toString(),
            "amount", "999999.00");

        mockMvc.perform(post("/internal/ledger/transfer")
                .header("X-Service-Key", "it-service-key")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.error.code").value("INSUFFICIENT_FUNDS"));
    }

    @Test
    void invalidBodyReturns400() throws Exception {
        final Map<String, Object> body = Map.of(
            "idempotencyKey", "", // vide → @NotBlank
            "transactionId", "pas-un-uuid",
            "fromWalletId", from.toString(),
            "toWalletId", to.toString(),
            "amount", "10.00");

        mockMvc.perform(post("/internal/ledger/transfer")
                .header("X-Service-Key", "it-service-key")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("VALIDATION_FAILED"));
    }

    @Test
    void verifyReportIsOkAfterTransfers() throws Exception {
        final String body = mockMvc.perform(get("/internal/ledger/verify")
                .header("X-Service-Key", "it-service-key"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.ok").value(true))
            .andExpect(jsonPath("$.unbalancedTransactions").value(0))
            .andExpect(jsonPath("$.balanceDrifts").value(0))
            .andReturn().getResponse().getContentAsString();
        assertThat(body).contains("\"entryCount\"");
        // Base partagée entre classes : au moins les 3 wallets de cette classe
        assertThat(balanceRepository.count()).isGreaterThanOrEqualTo(3);
    }
}
