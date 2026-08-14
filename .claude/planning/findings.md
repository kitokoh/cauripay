# Findings

## État main (0eca241) après consolidation lead
- G0 complet : Makefile (migrate-java → services/ledger-service), docker-compose.yml + override + staging, Dockerfiles nestjs/java, keycloak realm, rabbitmq definitions, prometheus+grafana, packages @goursi/shared-types + validation-rules, workflows ci/security-scan/deploy-staging, SECURITY.md, scripts/audit SQL.
- Legacy v0.1 → legacy/ (server + dashboard + docs). Racine workspaces = [services/*, apps/*, packages/*].
- DESIGN-v2 = source de vérité : ports 3000-3080, ledger 3010. Règles absolues : BigDecimal, SERIALIZABLE, @Immutable, Flyway seul maître DDL, X-Service-Key temps constant, idempotence Redis TTL 24h, événements après commit.

## Spécifications clés G1 (issues)
- #154 pom deps exactes : web, data-jpa, security, actuator, amqp, postgresql, flyway-core, data-redis, micrometer-prometheus, lombok, mapstruct 1.5.5.Final, validation, test, testcontainers. Port ${LEDGER_PORT:3010}. Hikari 20/5. default_schema ledger. checkpoint-cron "0 0 2 * * *". idempotency-ttl-hours 24.
- #157 V1 schema+uuid-ossp, V2 ledger_entries (immuable, idx le_transaction/le_wallet_date), V3 ledger_balances (balance/frozen/version).
- #159 V5 triggers (prevent_mutation, check_balance_positive), V6 audit views.
- #167 transferAtomic : 4 entries (PRINCIPAL debit/credit, FEE debit, FEE credit) SERIALIZABLE, idempotence avant écriture.
- #174 Controller : POST transfer|credit|debit|reverse, GET balance/{walletId}, POST verify. 401 sans X-Service-Key, 422 montant négatif.
- #178 verify : SUM(CREDIT)-SUM(DEBIT) vs balance → { consistent, computed, stored, delta }.

## Environnement local
- Node 24, JDK 21 (Temurin) + Maven 3.9.9 sous ~/.local/toolchain (JAVA_HOME requis).
- PAS de Docker → tests Testcontainers en CI uniquement ; vérif locale : compile + tests unitaires ; tentative Postgres binaire local pour migrations.
