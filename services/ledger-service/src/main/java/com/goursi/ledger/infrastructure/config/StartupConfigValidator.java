package com.goursi.ledger.infrastructure.config;

import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * Échec rapide au démarrage (fail-fast, GOURSI-001b / GOURSI-SEC1).
 *
 * <p>Refuse de démarrer si une configuration critique est absente, placeholder
 * ou invalide — un service financier ne démarre jamais « en aveugle ».
 * En dev/test, les contraintes sont assouplies (DX) ; en staging/production,
 * une clé placeholder ou courte bloque le démarrage.
 */
@Component
public class StartupConfigValidator implements ApplicationRunner {

  private static final Logger log = LoggerFactory.getLogger(StartupConfigValidator.class);

  private static final String[] PLACEHOLDERS = {"change-me", "changeme", "dev-secret", "test-"};

  private final String internalServiceKey;
  private final String checkpointCron;

  public StartupConfigValidator(
      @Value("${goursi.internal.service-key}") String internalServiceKey,
      @Value("${goursi.ledger.checkpoint-cron:0 0 2 * * *}") String checkpointCron) {
    this.internalServiceKey = internalServiceKey;
    this.checkpointCron = checkpointCron;
  }

  @Override
  public void run(ApplicationArguments args) {
    String env = env();
    boolean strict = "production".equalsIgnoreCase(env) || "staging".equalsIgnoreCase(env);

    if (internalServiceKey == null || internalServiceKey.isBlank()) {
      throw new IllegalStateException("FATAL — INTERNAL_SERVICE_KEY manquante : refus de démarrer (GOURSI-SEC1).");
    }
    if (strict && isPlaceholder(internalServiceKey)) {
      throw new IllegalStateException(
          "FATAL — INTERNAL_SERVICE_KEY placeholder en " + env + " : refus de démarrer.");
    }
    if (internalServiceKey.length() < 32) {
      if (strict) {
        throw new IllegalStateException("FATAL — INTERNAL_SERVICE_KEY trop courte (< 32 caractères) en " + env + ".");
      }
      log.warn("INTERNAL_SERVICE_KEY courte (< 32) en {} — acceptable en dev uniquement.", env);
    }
    if (checkpointCron == null || checkpointCron.isBlank()) {
      throw new IllegalStateException("FATAL — goursi.ledger.checkpoint-cron manquant.");
    }
    log.info("Configuration ledger validée (env={})", env);
  }

  private static String env() {
    String env = System.getenv("APP_ENV");
    if (env == null || env.isBlank()) {
      env = System.getenv("NODE_ENV");
    }
    return env == null || env.isBlank() ? "development" : env;
  }

  private boolean isPlaceholder(String value) {
    String lower = value.toLowerCase(Locale.ROOT);
    for (String placeholder : PLACEHOLDERS) {
      if (lower.contains(placeholder)) {
        return true;
      }
    }
    return false;
  }
}
