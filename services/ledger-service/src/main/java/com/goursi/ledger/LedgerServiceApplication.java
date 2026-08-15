package com.goursi.ledger;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * ledger-service — grand livre comptable GOURSI (vérité financière).
 * Jamais exposé publiquement : tout appel exige X-Service-Key (ServiceKeyFilter).
 */
@SpringBootApplication
@EnableScheduling
public class LedgerServiceApplication {

  public static void main(String[] args) {
    SpringApplication.run(LedgerServiceApplication.class, args);
  }
}
