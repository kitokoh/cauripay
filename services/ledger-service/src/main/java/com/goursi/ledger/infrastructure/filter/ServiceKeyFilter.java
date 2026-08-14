package com.goursi.ledger.infrastructure.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.security.MessageDigest;
import java.util.Set;

/**
 * GOURSI-010b — tout appel interne exige le header X-Service-Key, comparé en
 * temps constant (MessageDigest.isEqual, anti timing-attack).
 * Seuls /actuator/health et /actuator/prometheus sont accessibles sans clé.
 */
@Component
public class ServiceKeyFilter extends OncePerRequestFilter {

    private static final Set<String> WHITELISTED_PATHS = Set.of(
        "/actuator/health", "/actuator/health/liveness", "/actuator/health/readiness",
        "/actuator/prometheus"
    );

    private final byte[] expected;

    public ServiceKeyFilter(@Value("${goursi.internal.service-key}") String serviceKey) {
        this.expected = serviceKey.getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return WHITELISTED_PATHS.stream().anyMatch(p -> path.equals(p) || path.startsWith(p + "/"));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String provided = request.getHeader("X-Service-Key");
        byte[] actual = provided == null ? new byte[0] : provided.getBytes(java.nio.charset.StandardCharsets.UTF_8);

        if (!MessageDigest.isEqual(expected, actual)) {
            response.setStatus(401);
            response.setContentType("application/json");
            response.getWriter().write(
                "{\"success\":false,\"error\":{\"code\":\"INVALID_SERVICE_KEY\",\"message\":\"Unauthorized\"}}");
            return;
        }
        chain.doFilter(request, response);
    }
}
