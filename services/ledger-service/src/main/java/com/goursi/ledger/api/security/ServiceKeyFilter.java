package com.goursi.ledger.api.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Auth inter-services : X-Service-Key comparé en TEMPS CONSTANT
 * (MessageDigest.isEqual — anti timing attack). Whitelist health/metrics.
 * Ne jamais logger la clé.
 */
@Component
public class ServiceKeyFilter extends OncePerRequestFilter {

  private final byte[] expectedKey;

  public ServiceKeyFilter(@Value("${goursi.internal.service-key}") String expectedKey) {
    this.expectedKey = expectedKey.getBytes(StandardCharsets.UTF_8);
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    String path = request.getRequestURI();
    return path.startsWith("/actuator/health")
        || path.startsWith("/actuator/prometheus")
        || path.equals("/actuator/info");
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    String provided = request.getHeader("X-Service-Key");
    if (provided == null
        || !MessageDigest.isEqual(expectedKey, provided.getBytes(StandardCharsets.UTF_8))) {
      response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
      response.setContentType("application/json");
      response.setCharacterEncoding("UTF-8");
      response.getWriter().write(
          "{\"success\":false,\"error\":{\"code\":\"INVALID_SERVICE_KEY\",\"message\":\"Unauthorized\"}}");
      return;
    }
    chain.doFilter(request, response);
  }
}
