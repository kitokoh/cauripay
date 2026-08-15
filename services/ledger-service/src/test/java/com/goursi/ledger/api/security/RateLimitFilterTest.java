package com.goursi.ledger.api.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import jakarta.servlet.ServletException;
import java.io.IOException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

/** GOURSI-SEC2 — rate-limiting inter-services sur /internal/ledger/*. */
class RateLimitFilterTest {

  private RateLimitFilter filter;

  @BeforeEach
  void setUp() {
    filter = new RateLimitFilter(1000); // 1000 req/min
  }

  private MockHttpServletRequest req(String path, String key) {
    MockHttpServletRequest r = new MockHttpServletRequest("POST", path);
    if (key != null) r.addHeader("X-Service-Key", key);
    return r;
  }

  @Test
  void allows_under_threshold() throws ServletException, IOException {
    MockHttpServletRequest req = req("/internal/ledger/transfer", "service-key");
    MockHttpServletResponse res = new MockHttpServletResponse();
    filter.doFilter(req, res, new MockFilterChain());
    assertEquals(200, res.getStatus());
    assertEquals("1000", res.getHeader("X-RateLimit-Limit"));
    assertEquals("999", res.getHeader("X-RateLimit-Remaining"));
  }

  @Test
  void returns_429_when_exceeded() throws ServletException, IOException {
    for (int i = 0; i < 1000; i++) {
      filter.doFilter(req("/internal/ledger/transfer", "key-a"), new MockHttpServletResponse(), new MockFilterChain());
    }
    MockHttpServletResponse res = new MockHttpServletResponse();
    filter.doFilter(req("/internal/ledger/transfer", "key-a"), res, new MockFilterChain());
    assertEquals(429, res.getStatus());
    assertTrue(res.getContentAsString().contains("RATE_LIMITED"));
    assertEquals("0", res.getHeader("X-RateLimit-Remaining"));
  }

  @Test
  void quotas_independent_per_key() throws ServletException, IOException {
    for (int i = 0; i < 1000; i++) {
      filter.doFilter(req("/internal/ledger/transfer", "key-1"), new MockHttpServletResponse(), new MockFilterChain());
    }
    // key-2 démarre à son propre quota
    MockHttpServletResponse res = new MockHttpServletResponse();
    filter.doFilter(req("/internal/ledger/transfer", "key-2"), res, new MockFilterChain());
    assertEquals(200, res.getStatus());
    assertEquals("999", res.getHeader("X-RateLimit-Remaining"));
  }

  @Test
  void health_never_limited() throws ServletException, IOException {
    for (int i = 0; i < 5000; i++) {
      filter.doFilter(req("/actuator/health", "key-h"), new MockHttpServletResponse(), new MockFilterChain());
    }
    MockHttpServletResponse res = new MockHttpServletResponse();
    filter.doFilter(req("/actuator/health", "key-h"), res, new MockFilterChain());
    assertEquals(200, res.getStatus());
  }

  @Test
  void non_internal_paths_not_limited() throws ServletException, IOException {
    for (int i = 0; i < 5000; i++) {
      filter.doFilter(req("/other/path", "key-o"), new MockHttpServletResponse(), new MockFilterChain());
    }
    MockHttpServletResponse res = new MockHttpServletResponse();
    filter.doFilter(req("/other/path", "key-o"), res, new MockFilterChain());
    assertEquals(200, res.getStatus());
  }
}
