#!/usr/bin/env bash
# =============================================================================
# CauriPay — déploiement staging (GOURSI-005c)
# 1. Migrations (ledger Flyway, api-core Prisma)  2. docker compose up
# Usage (sur le hôte staging, dans ~/cauripay) : TAG=abc bash scripts/deploy-staging.sh
# =============================================================================
set -euo pipefail

TAG="${TAG:-latest}"
COMPOSE="docker compose --env-file .env -f compose.staging.yml"

echo "==> Pull images (TAG=${TAG})"
"${COMPOSE}" pull

echo "==> Migrations ledger (Flyway)"
if docker run --rm \
  -v "$PWD/services/ledger:/repo" \
  -w /repo \
  -e LEDGER_DB_URL="jdbc:postgresql://$(grep '^POSTGRES_HOST=' .env | cut -d= -f2):5432/cauripay" \
  maven:3.9-eclipse-temurin-21 \
  mvn -q flyway:migrate -Dflyway.url="${LEDGER_DB_URL:-jdbc:postgresql://localhost:5432/cauripay}" \
    -Dflyway.user="${POSTGRES_USER:-cauripay}" -Dflyway.password="${POSTGRES_PASSWORD:-cauripay_dev_password}"; then
  echo "   ✓ migrations ledger appliquées"
fi

echo "==> Migrations api-core (Prisma)"
if [[ -d "$PWD/services/api-core" ]]; then
  (cd services/api-core && npx prisma migrate deploy)
fi

echo "==> Topologies (Keycloak, RabbitMQ)"
node infra/keycloak/seed-realm.mjs
node infra/rabbitmq/declare-topology.mjs

echo "==> Up"
TAG="${TAG}" "${COMPOSE}" up -d --remove-orphans
"${COMPOSE}" ps
