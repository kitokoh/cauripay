package com.goursi.ledger.api.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ServiceKeyFilterTest {

    private ServiceKeyFilter filter;
    private final ObjectMapper mapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        filter = new ServiceKeyFilter(mapper);
        // injection de la valeur via réflexion (pas de Spring ici)
        try {
            var field = ServiceKeyFilter.class.getDeclaredField("expectedServiceKey");
            field.setAccessible(true);
            field.set(filter, "test-secret-key");
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    @Test
    void rejects_request_without_key() throws ServletException, IOException {
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/internal/ledger/transfer");
        MockHttpServletResponse res = new MockHttpServletResponse();
        filter.doFilter(req, res, new MockFilterChain());
        assertEquals(401, res.getStatus());
    }

    @Test
    void rejects_wrong_key() throws ServletException, IOException {
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/internal/ledger/transfer");
        req.addHeader("X-Service-Key", "wrong");
        MockHttpServletResponse res = new MockHttpServletResponse();
        filter.doFilter(req, res, new MockFilterChain());
        assertEquals(401, res.getStatus());
    }

    @Test
    void accepts_correct_key() throws ServletException, IOException {
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/internal/ledger/transfer");
        req.addHeader("X-Service-Key", "test-secret-key");
        MockHttpServletResponse res = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();
        filter.doFilter(req, res, chain);
        assertEquals(200, res.getStatus());
        assertEquals(true, chain.getRequest() != null);
    }

    @Test
    void whitelists_health() throws ServletException, IOException {
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/actuator/health");
        MockHttpServletResponse res = new MockHttpServletResponse();
        filter.doFilter(req, res, new MockFilterChain());
        assertEquals(200, res.getStatus());
    }
}
