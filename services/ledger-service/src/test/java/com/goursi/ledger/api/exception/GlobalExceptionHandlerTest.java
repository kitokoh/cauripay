package com.goursi.ledger.api.exception;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.goursi.ledger.domain.exception.IdempotencyConflictException;
import com.goursi.ledger.domain.exception.InsufficientFundsException;
import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

/** GOURSI-010c — enveloppe d'erreur structurée : 422 / 409 / 500. */
class GlobalExceptionHandlerTest {

  private MockMvc mockMvc;

  @RestController
  static class StubController {
    @PostMapping("/stub/insufficient")
    void insufficient() {
      throw new InsufficientFundsException(UUID.randomUUID(), new BigDecimal("100.00"), new BigDecimal("500.00"));
    }

    @PostMapping("/stub/conflict")
    void conflict() {
      throw new IdempotencyConflictException("key-1");
    }

    @PostMapping("/stub/boom")
    void boom() {
      throw new IllegalStateException("boom");
    }
  }

  @BeforeEach
  void setUp() {
    mockMvc = MockMvcBuilders.standaloneSetup(new StubController())
        .setControllerAdvice(new GlobalExceptionHandler())
        .build();
  }

  @Test
  void insufficientFundsMapsTo422() throws Exception {
    mockMvc.perform(post("/stub/insufficient"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("INSUFFICIENT_FUNDS"))
        .andExpect(jsonPath("$.message").value("Solde insuffisant"))
        .andExpect(jsonPath("$.details.walletId").exists())
        .andExpect(jsonPath("$.details.balance").value(100.00))
        .andExpect(jsonPath("$.details.requested").value(500.00))
        .andExpect(jsonPath("$.timestamp").exists())
        .andExpect(jsonPath("$.requestId").exists());
  }

  @Test
  void idempotencyConflictMapsTo409() throws Exception {
    mockMvc.perform(post("/stub/conflict"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("IDEMPOTENCY_CONFLICT"));
  }

  @Test
  void genericErrorMapsTo500WithoutLeak() throws Exception {
    mockMvc.perform(post("/stub/boom"))
        .andExpect(status().isInternalServerError())
        .andExpect(jsonPath("$.code").value("INTERNAL_ERROR"))
        .andExpect(jsonPath("$.message").value("Erreur interne du service"))
        .andExpect(jsonPath("$.details").doesNotExist());
  }
}
