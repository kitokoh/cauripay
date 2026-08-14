package com.goursi.ledger.api.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.security.MessageDigest;
import java.util.Map;
import java.util.Set;

/**
 * Exige le header X-Service-Key sur tout appel interne.
 * Comparaison en temps constant (MessageDigest.isEqual) — anti timing attack.
 * Whitelist : /actuator/health et /actuator/prometheus.
 */
@Component
@RequiredArgsConstructor
public class ServiceKeyFilter extends OncePerRequestFilter {

    private static final String SERVICE_KEY_HEADER = "X-Service-Key";
    private static final Set<String> WHITELIST = Set.of(
            "/actuator/health", "/actuator/prometheus");

    private final ObjectMapper objectMapper;

    @Value("${goursi.internal.service-key}")
    private String expectedServiceKey;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String path = request.getRequestURI();
        if (WHITELIST.contains(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        String provided = request.getHeader(SERVICE_KEY_HEADER);
        if (provided == null || !constantTimeEquals(provided, expectedServiceKey)) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write(objectMapper.writeValueAsString(Map.of(
                    "success", false,
                    "error", Map.of(
                            "code", "INVALID_SERVICE_KEY",
                            "message", "Unauthorized"
                    )
            )));
            return;
        }

        filterChain.doFilter(request, response);
    }

    /** Comparaison en temps constant — jamais de equals() naïf. */
    private boolean constantTimeEquals(String a, String b) {
        byte[] aBytes = a.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        byte[] bBytes = b.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        return MessageDigest.isEqual(aBytes, bBytes);
    }
}
