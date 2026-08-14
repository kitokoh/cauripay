package com.goursi.ledger.api.security;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class ServiceKeyFilterTest {

  private static final String EXPECTED = "super-secret-service-key";

  private ServiceKeyFilter filter;

  @BeforeEach
  void setUp() {
    filter = new ServiceKeyFilter(EXPECTED);
  }

  @Test
  void sans_cle_401() throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest("GET", "/internal/ledger/balance/1");
    MockHttpServletResponse response = new MockHttpServletResponse();
    filter.doFilter(request, response, mockChain());
    assertThat(response.getStatus()).isEqualTo(401);
    assertThat(response.getContentAsString()).contains("INVALID_SERVICE_KEY");
  }

  @Test
  void cle_incorrecte_401() throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest("GET", "/internal/ledger/balance/1");
    request.addHeader("X-Service-Key", "mauvaise-cle");
    MockHttpServletResponse response = new MockHttpServletResponse();
    filter.doFilter(request, response, mockChain());
    assertThat(response.getStatus()).isEqualTo(401);
  }

  @Test
  void bonne_cle_passe() throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest("GET", "/internal/ledger/balance/1");
    request.addHeader("X-Service-Key", EXPECTED);
    MockHttpServletResponse response = new MockHttpServletResponse();
    boolean[] called = {false};
    FilterChain chain = (req, res) -> called[0] = true;
    filter.doFilter(request, response, chain);
    assertThat(called[0]).isTrue();
    assertThat(response.getStatus()).isEqualTo(200);
  }

  @Test
  void health_est_whiteliste() throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest("GET", "/actuator/health");
    MockHttpServletResponse response = new MockHttpServletResponse();
    boolean[] called = {false};
    FilterChain chain = (req, res) -> called[0] = true;
    filter.doFilter(request, response, chain);
    assertThat(called[0]).isTrue();
  }

  @Test
  void prometheus_est_whiteliste() throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest("GET", "/actuator/prometheus");
    MockHttpServletResponse response = new MockHttpServletResponse();
    boolean[] called = {false};
    FilterChain chain = (req, res) -> called[0] = true;
    filter.doFilter(request, response, chain);
    assertThat(called[0]).isTrue();
  }

  private FilterChain mockChain() {
    return (req, res) -> {
      // no-op
    };
  }
}
