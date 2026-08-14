package com.goursi.ledger.infrastructure.config;

import java.util.UUID;
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
 */
@Component
public class StartupConfigValidator implements ApplicationRunner {

  private static final Logger log = LoggerFactory.getLogger(StartupConfigValidator.class);

  private static final String[] PLACEHOLDERS = {"change-me", "changeme", "test", "dev-secret"};

  private final String internalServiceKey;
  private final String platformFeesWalletId;
  private final String checkpointCron;

  public StartupConfigValidator(
      @Value("${goursi.ledger.internal-service-key}") String internalServiceKey,
      @Value("${goursi.ledger.platform-fees-wallet-id}") String platformFeesWalletId,
      @Value("${goursi.ledger.checkpoint-cron}") String checkpointCron) {
    this.internalServiceKey = internalServiceKey;
    this.platformFeesWalletId = platformFeesWalletId;
    this.checkpointCron = checkpointCron;
  }

  @Override
  public void run(ApplicationArguments args) {
    String env = System.getenv("NODE_ENV") != null ? System.getenv("NODE_ENV") : "development";
    boolean production = "production".equalsIgnoreCase(env) || "staging".equalsIgnoreCase(env);

    if (internalServiceKey == null || internalServiceKey.isBlank()) {
      throw new IllegalStateException("FATAL — INTERNAL_SERVICE_KEY manquante : refus de démarrer (GOURSI-SEC1).");
    }
    if (production && isPlaceholder(internalServiceKey)) {
      throw new IllegalStateException("FATAL — INTERNAL_SERVICE_KEY placeholder en " + env + " : refus de démarrer.");
    }
    if (internalServiceKey.length() < 32) {
      throw new IllegalStateException("FATAL — INTERNAL_SERVICE_KEY trop courte (< 32 caractères).");
    }
    try {
      UUID.fromString(platformFeesWalletId);
    } catch (IllegalArgumentException e) {
      throw new IllegalStateException("FATAL — PLATFORM_FEES_WALLET_ID n'est pas un UUID valide : " + platformFeesWalletId);
    }
    if (checkpointCron == null || checkpointCron.isBlank()) {
      throw new IllegalStateException("FATAL — goursi.ledger.checkpoint-cron manquant.");
    }
    log.info("Configuration ledger validée (env={})", env);
  }

  private boolean isPlaceholder(String value) {
    String lower = value.toLowerCase();
    for (String placeholder : PLACEHOLDERS) {
      if (lower.contains(placeholder)) {
        return true;
      }
    }
    return false;
  }
}
