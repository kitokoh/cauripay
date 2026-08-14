package com.cauripay.ledger;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * ledger-service — grand livre comptable CauriPay (GOURSI-010a).
 *
 * <p>Seul service autorisé à écrire les soldes wallets (règle absolue n°1).
 * Exposé uniquement en interne via {@code /internal/ledger/*} (X-Service-Key).
 */
@SpringBootApplication
@EnableScheduling
public class LedgerServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(LedgerServiceApplication.class, args);
    }
}
