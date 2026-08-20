package com.goursi.ledger.api.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Rate-limiting inter-services (GOURSI-SEC2) sur /internal/ledger/*.
 *
 * - Fenêtre glissante par clé X-Service-Key (défaut 1000 req/min, configurable
 *   via goursi.ledger.rate-limit-per-minute).
 * - Dépassement → 429 { success:false, error: { code: "RATE_LIMITED", ... } }.
 * - Whitelist /actuator/* (health/prometheus/info) : jamais limité.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class RateLimitFilter extends OncePerRequestFilter {

  private static final long WINDOW_MS = 60_000L;

  private final long maxRequestsPerWindow;
  private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

  public RateLimitFilter(@Value("${goursi.ledger.rate-limit-per-minute:1000}") long maxRequestsPerWindow) {
    this.maxRequestsPerWindow = maxRequestsPerWindow;
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    String path = request.getRequestURI();
    return !path.startsWith("/internal/")
        || path.startsWith("/actuator/");
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {

    String key = hash(request.getHeader("X-Service-Key"));
    Bucket bucket = buckets.computeIfAbsent(key, k -> new Bucket());
    boolean allowed = bucket.tryAcquire();

    response.setHeader("X-RateLimit-Limit", String.valueOf(maxRequestsPerWindow));
    response.setHeader("X-RateLimit-Remaining", String.valueOf(bucket.remaining()));
    response.setHeader("X-RateLimit-Reset", String.valueOf(bucket.resetEpochSecond()));

    if (!allowed) {
      response.setStatus(429);
      response.setContentType("application/json");
      response.setCharacterEncoding(StandardCharsets.UTF_8.name());
      response.getWriter().write("""
          {"success":false,"error":{"code":"RATE_LIMITED","message":"Quota inter-services dépassé (1000 req/min)"}}
          """.trim());
      return;
    }
    chain.doFilter(request, response);
  }

  private String hash(String raw) {
    if (raw == null) return "anonymous";
    try {
      byte[] digest = MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8));
      StringBuilder sb = new StringBuilder();
      for (byte b : digest) sb.append(String.format("%02x", b));
      return sb.toString();
    } catch (Exception e) {
      return "anonymous";
    }
  }

  private final class Bucket {
    private long windowStart = System.currentTimeMillis();
    private long count = 0;

    synchronized boolean tryAcquire() {
      long now = System.currentTimeMillis();
      if (now - windowStart >= WINDOW_MS) {
        windowStart = now;
        count = 0;
      }
      if (count >= maxRequestsPerWindow) return false;
      count++;
      return true;
    }

    synchronized long remaining() {
      long now = System.currentTimeMillis();
      if (now - windowStart >= WINDOW_MS) return maxRequestsPerWindow;
      return Math.max(0, maxRequestsPerWindow - count);
    }

    long resetEpochSecond() {
      return (windowStart + WINDOW_MS) / 1000;
    }
  }
}
