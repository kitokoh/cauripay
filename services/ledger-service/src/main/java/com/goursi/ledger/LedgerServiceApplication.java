package com.goursi.ledger;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * ledger-service — cœur comptable de la plateforme CauriPay/GOURSI.
 *
 * <p>Règle absolue n°1 : seul ce service écrit {@code ledger_balances}.
 * Règles : montants BigDecimal (jamais double/float), écritures SERIALIZABLE,
 * entrées immuables (JPA @Immutable + triggers V5), DDL exclusivement Flyway.
 */
@SpringBootApplication
public class LedgerServiceApplication {

  public static void main(String[] args) {
    SpringApplication.run(LedgerServiceApplication.class, args);
  }
}
