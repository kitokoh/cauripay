# ledger-service — grand livre comptable GOURSI

> **La vérité financière de la plateforme.** Double écriture, soldes par wallet,
> verrou optimiste, idempotence Redis, événements RabbitMQ. Règle absolue :
> **seuls les endpoints `/internal/ledger/*` modifient les soldes.**

## Stack

Java 21 · Spring Boot 3.2 · PostgreSQL 16 (Flyway V1→V6) · Redis (idempotence, TTL 24h) ·
RabbitMQ (`financial.events`) · Prometheus (`/actuator/prometheus`) · MapStruct · Testcontainers.

## Structure (DDD)

```
com.goursi.ledger
├── domain/        entités immuables (LedgerEntry), soldes @Version, commandes validées, résultats
├── application/   IdempotencyService, LedgerWriteService (SERIALIZABLE), Read/Verify, CheckpointScheduler
├── infrastructure/ Redis, RabbitMQ, ServiceKeyFilter (temps constant), métriques Micrometer
└── api/           LedgerController (/internal/ledger/*), DTOs MapStruct, enveloppe d'erreur
```

## Contrat

| Endpoint | Description |
|---|---|
| `POST /internal/ledger/transfer` | P2P : 4 écritures (2 si zéro frais), SERIALIZABLE, idempotent |
| `POST /internal/ledger/credit` / `/debit` | Opérations unitaires (cash-in/out) |
| `POST /internal/ledger/reverse` | Écritures miroir REVERSAL |
| `GET /internal/ledger/balance/{walletId}` | Solde + gel + version |
| `GET /internal/ledger/entries/{walletId}?cursor&limit` | Historique paginé (curseur) |
| `POST /internal/ledger/verify` | Contrôle COBAC : SUM(entries) vs solde stocké |

Erreurs : `404 WALLET_NOT_FOUND` · `409 IDEMPOTENCY_CONFLICT / OPTIMISTIC_LOCK` (retentable) · `422 INSUFFICIENT_FUNDS / VALIDATION_ERROR`.

Tout appel exige `X-Service-Key` (comparaison temps constant) ; `/actuator/health` et `/actuator/prometheus` sont publics.

## Run

```bash
# infra locale (Postgres, Redis, RabbitMQ)
docker compose up -d postgres redis rabbitmq

# service
cd services/ledger-service
LEDGER_DATABASE_URL=jdbc:postgresql://localhost:5432/goursi POSTGRES_USER=goursi POSTGRES_PASSWORD=goursi \
mvn spring-boot:run        # port 3010, migrations Flyway auto
```

## Tests

```bash
mvn test                   # unitaires + intégration (Testcontainers, nécessite Docker)
```

Les tests d'intégration couvrent : 4 écritures exactes, idempotence (rejeu sans doublon,
409 sur payload différent), refus de découvert, concurrence 10 threads (aucune corruption),
contrat HTTP 200/401/404/409/422, contrôle d'intégrité.
