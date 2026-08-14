package com.goursi.ledger.infrastructure.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.goursi.ledger.api.exception.ErrorEnvelope;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Authentifie les appels inter-services via le header {@code X-Service-Key}.
 *
 * <p>Comparaison en temps constant ({@link MessageDigest#isEqual}) — jamais
 * {@code equals} sur des secrets (GOURSI-010b, §3.7). Les endpoints actuator
 * (health, metrics) restent accessibles sans clé : ils ne sont pas exposés
 * publiquement (réseau Docker interne) et sont utilisés par les HEALTHCHECK.
 */
public class ServiceKeyFilter extends OncePerRequestFilter {

  public static final String HEADER = "X-Service-Key";
  public static final String ERROR_CODE = "INVALID_SERVICE_KEY";

  private final byte[] expectedKey;
  private final ObjectMapper objectMapper = new ObjectMapper()
      .registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule())
      .disable(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

  public ServiceKeyFilter(String internalServiceKey) {
    this.expectedKey = internalServiceKey.getBytes(StandardCharsets.UTF_8);
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    String path = request.getRequestURI();
    return path.startsWith("/actuator/");
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    String provided = request.getHeader(HEADER);
    if (provided == null || !MessageDigest.isEqual(expectedKey, provided.getBytes(StandardCharsets.UTF_8))) {
      response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
      response.setContentType(MediaType.APPLICATION_JSON_VALUE);
      response.setCharacterEncoding(StandardCharsets.UTF_8.name());
      ErrorEnvelope envelope = ErrorEnvelope.of(ERROR_CODE, "Clé de service invalide", requestId(request));
      response.getWriter().write(objectMapper.writeValueAsString(envelope));
      return;
    }
    chain.doFilter(request, response);
  }

  private String requestId(HttpServletRequest request) {
    String rid = request.getHeader("X-Request-Id");
    return rid != null && !rid.isBlank() ? rid : java.util.UUID.randomUUID().toString();
  }
}
