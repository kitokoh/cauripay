# ledger-service — grand livre comptable CauriPay (Bloc G1)

> **Seul service autorisé à écrire les soldes wallets** (règle absolue n°1, ADR-004).
> Java 21 · Spring Boot 3.2 · PostgreSQL 16 (Flyway) · Redis 7 (idempotence) · RabbitMQ (événements).

## Rôle

Vérité financière de la plateforme : écritures comptables immuables (double écriture),
soldes avec verrou optimiste `@Version`, transferts atomiques en isolation `SERIALIZABLE`.

## API interne (`/internal/ledger/*` — X-Service-Key obligatoire)

| Méthode | Route | Rôle |
|---|---|---|
| POST | `/internal/ledger/transfer` | Transfer atomique (4 écritures : débit/crédit principal + frais) |
| POST | `/internal/ledger/credit` | Crédit unitaire (auto-provisionne le wallet à 0) |
| POST | `/internal/ledger/debit` | Débit unitaire (solde insuffisant → 422) |
| POST | `/internal/ledger/reverse` | Écritures miroir REVERSAL (restauration des soldes) |
| GET | `/internal/ledger/wallets/{id}/balance` | Solde + version optimiste |
| GET | `/internal/ledger/wallets/{id}/history` | Historique paginé (keyset) |
| GET | `/internal/ledger/verify` | Rapport d'intégrité (équilibre comptable, drifts) |
| POST | `/internal/ledger/checkpoint` | Snapshot immédiat (ops) |
| GET | `/actuator/health`, `/actuator/prometheus` | Observabilité |

Contrat partagé : `packages/shared-types` (TransferCommand, BalanceResult, LedgerEntryView…).

## Invariants (liste rouge)

1. Montants en `BigDecimal` (jamais float) — échelle 2, JSON en string.
2. Écritures immuables : `@Immutable` + triggers PostgreSQL V5 (UPDATE/DELETE → « Opération interdite »).
3. `@Version` sur `ledger_balances` ; `SERIALIZABLE` + retry (backoff + jitter) sur les écritures.
4. Idempotence Redis (TTL 24 h) — rejeu sans double écriture, conflit concurrent géré.
5. Événements publiés **après commit** uniquement (`financial.events: transaction.completed|reversed|failed`).
6. Le compte `00000000-0000-0000-0000-0000000000ca` = capital (émission) — seule écriture simple exempte d'équilibre.
7. Migrations Flyway : jamais modifiées après application (nouvelle V{n+1} pour tout correctif).

## Local

```bash
make up                 # Postgres, Redis, RabbitMQ…
export LEDGER_DATABASE_URL=jdbc:postgresql://localhost:5432/goursi_ledger
export POSTGRES_USER=goursi POSTGRES_PASSWORD=goursi_dev_password
export INTERNAL_SERVICE_KEY=dev-key
mvn spring-boot:run     # http://localhost:3010
```

## Tests

```bash
mvn test                          # unitaires (14, aucun service requis)
mvn verify -Pit                   # intégration : Testcontainers (Postgres 16 + Redis 7) OU
                                  # local : LEDGER_TEST_DB_URL / LEDGER_TEST_REDIS_URL
```

Preuves DoD : 4 écritures (`LedgerWriteServiceIT`), concurrence 10 threads
(`ConcurrencyIT`), triggers d'immutabilité (`MigrationAcceptanceIT`), équilibre 0 écart
(`LedgerControllerIT.verify`).
