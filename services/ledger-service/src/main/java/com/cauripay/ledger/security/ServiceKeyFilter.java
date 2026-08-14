package com.cauripay.ledger.common;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;
import java.util.UUID;

/**
 * Authentification inter-services : header {@code X-Service-Key} comparé en
 * temps constant (GOURSI-010b). Toute requête sans clé valide → 401.
 *
 * <p>Fail-fast : au démarrage, le service refuse de fonctionner si la clé
 * n'est pas configurée ({@code INTERNAL_SERVICE_KEY}).
 *
 * <p>Exemptés : health checks et métriques Prometheus (scraping interne).
 */
@Component
public class ServiceKeyFilter extends OncePerRequestFilter {

    private static final String HEADER = "X-Service-Key";
    private static final String REQUEST_ID_HEADER = "X-Request-Id";

    private final String expectedKey;
    private final ObjectMapper objectMapper;

    public ServiceKeyFilter(
        @Value("${ledger.service-key}") String expectedKey,
        ObjectMapper objectMapper) {
        if (expectedKey == null || expectedKey.isBlank()) {
            throw new IllegalStateException(
                "INTERNAL_SERVICE_KEY non configurée — refus de démarrer (fail-fast).");
        }
        this.expectedKey = expectedKey;
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.startsWith("/actuator/health") || path.startsWith("/actuator/prometheus");
    }

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain chain) throws ServletException, IOException {

        String provided = request.getHeader(HEADER);
        if (provided == null || !constantTimeEquals(provided, expectedKey)) {
            writeUnauthorized(response, request);
            return;
        }
        chain.doFilter(request, response);
    }

    /** Comparaison en temps constant (MessageDigest.isEqual) — jamais de {@code ==}. */
    private static boolean constantTimeEquals(String a, String b) {
        return MessageDigest.isEqual(
            a.getBytes(StandardCharsets.UTF_8),
            b.getBytes(StandardCharsets.UTF_8));
    }

    private void writeUnauthorized(HttpServletResponse response, HttpServletRequest request)
        throws IOException {
        final String headerRequestId = request.getHeader(REQUEST_ID_HEADER);
        final String requestId = (headerRequestId == null || headerRequestId.isBlank())
            ? UUID.randomUUID().toString()
            : headerRequestId;
        response.setStatus(401);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(response.getWriter(), Map.of(
            "success", false,
            "timestamp", java.time.Instant.now().toString(),
            "requestId", requestId,
            "error", Map.of(
                "code", ErrorCode.INVALID_SERVICE_KEY.name(),
                "message", "Clé de service invalide ou absente (X-Service-Key).")));
    }
}
