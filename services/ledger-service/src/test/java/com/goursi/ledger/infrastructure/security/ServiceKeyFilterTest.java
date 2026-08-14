package com.goursi.ledger.infrastructure.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

/** GOURSI-010b — X-Service-Key : 401 sans clé / mauvaise clé, passage sinon. */
class ServiceKeyFilterTest {

  private static final String VALID_KEY = "0123456789abcdef0123456789abcdef";

  private ServiceKeyFilter filter;
  private MockHttpServletResponse response;
  private MockHttpServletRequest request;
  private boolean chainCalled;

  @BeforeEach
  void setUp() {
    filter = new ServiceKeyFilter(VALID_KEY);
    response = new MockHttpServletResponse();
    chainCalled = false;
  }

  private FilterChain passthrough() {
    return (req, res) -> chainCalled = true;
  }

  @Test
  void validKeyAllowsRequest() throws Exception {
    request = new MockHttpServletRequest("POST", "/internal/ledger/transfer");
    request.addHeader(ServiceKeyFilter.HEADER, VALID_KEY);
    filter.doFilter(request, response, passthrough());
    assertEquals(200, response.getStatus());
    assertTrue(chainCalled, "la chaîne doit continuer avec une clé valide");
  }

  @Test
  void missingKeyReturns401() throws Exception {
    request = new MockHttpServletRequest("POST", "/internal/ledger/transfer");
    filter.doFilter(request, response, passthrough());
    assertEquals(401, response.getStatus());
    assertTrue(response.getContentAsString().contains(ServiceKeyFilter.ERROR_CODE));
  }

  @Test
  void wrongKeyReturns401() throws Exception {
    request = new MockHttpServletRequest("POST", "/internal/ledger/transfer");
    request.addHeader(ServiceKeyFilter.HEADER, "clé-totalement-fausse");
    filter.doFilter(request, response, passthrough());
    assertEquals(401, response.getStatus());
    assertTrue(response.getContentAsString().contains(ServiceKeyFilter.ERROR_CODE));
  }

  @Test
  void actuatorHealthIsSkipped() throws Exception {
    request = new MockHttpServletRequest("GET", "/actuator/health");
    filter.doFilter(request, response, passthrough());
    assertTrue(chainCalled, "les endpoints actuator doivent rester accessibles (HEALTHCHECK)");
  }
}
