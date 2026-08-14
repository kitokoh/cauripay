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

/**
 * GOURSI-010c — enveloppe d'erreur structurée : 422 / 409 / 500.
 * Enveloppe : {@code { success:false, error:{ code, message, details }, timestamp }}.
 */
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
        .andExpect(jsonPath("$.success").value(false))
        .andExpect(jsonPath("$.error.code").value("INSUFFICIENT_FUNDS"))
        .andExpect(jsonPath("$.error.message").value("Solde insuffisant"))
        .andExpect(jsonPath("$.error.details.walletId").exists())
        .andExpect(jsonPath("$.error.details.available").value("100.00"))
        .andExpect(jsonPath("$.error.details.requested").value("500.00"))
        .andExpect(jsonPath("$.timestamp").exists());
  }

  @Test
  void idempotencyConflictMapsTo409() throws Exception {
    mockMvc.perform(post("/stub/conflict"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.error.code").value("IDEMPOTENCY_CONFLICT"))
        .andExpect(jsonPath("$.error.details.idempotencyKey").value("key-1"));
  }

  @Test
  void genericErrorMapsTo500WithoutLeak() throws Exception {
    mockMvc.perform(post("/stub/boom"))
        .andExpect(status().isInternalServerError())
        .andExpect(jsonPath("$.error.code").value("INTERNAL_ERROR"))
        .andExpect(jsonPath("$.error.message").value("Erreur interne"))
        .andExpect(jsonPath("$.error.details").doesNotExist());
  }
}
