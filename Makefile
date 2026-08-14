# =============================================================================
# CauriPay — Makefile unifié (GOURSI-003)
# Cibles : install / up / down / migrate / seed / test / test-java / test-java-it
#          / lint / studio / validate-env / build
# =============================================================================

SHELL := /bin/bash
.DEFAULT_GOAL := help

# --- Outils -----------------------------------------------------------------
NPM := npm
MVN := mvn
DOCKER := docker compose

# --- Cibles ----------------------------------------------------------------

.PHONY: help install up down logs migrate seed test test-java test-java-it lint build validate-env studio clean

help: ## Affiche l'aide
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

install: ## Installe les dépendances (npm workspaces + Maven wrapper)
	$(NPM) install
	cd services/ledger && $(MVN) -q dependency:go-offline

up: ## Démarre l'infrastructure (Postgres, Redis, RabbitMQ, Keycloak, Prometheus, Grafana)
	$(DOCKER) --env-file .env up -d
	$(DOCKER) --env-file .env ps

down: ## Arrête l'infrastructure
	$(DOCKER) --env-file .env down

logs: ## Suit les logs de l'infrastructure
	$(DOCKER) --env-file .env logs -f

migrate: ## Applique les migrations (ledger Flyway + api-core Prisma)
	cd services/ledger && $(MVN) -q flyway:migrate -Dflyway.url="$(LEDGER_DB_URL)" -Dflyway.user="$(POSTGRES_USER)" -Dflyway.password="$(POSTGRES_PASSWORD)"
	@if [ -d services/api-core ]; then cd services/api-core && npx prisma migrate deploy; fi

seed: ## Seed idempotent (Keycloak realm + données de dev)
	node infra/keycloak/seed-realm.mjs
	@if [ -d services/api-core ]; then cd services/api-core && npx prisma db seed; fi

test: ## Tests TypeScript (jest, tous les workspaces)
	$(NPM) test

test-java: ## Tests Java unitaires (ledger)
	cd services/ledger && $(MVN) test

test-java-it: ## Tests Java d'intégration (Testcontainers — nécessite Docker)
	cd services/ledger && $(MVN) verify -Pit

lint: ## Lint + typecheck TS
	$(NPM) run lint
	$(NPM) run typecheck

build: ## Build TS (tous les workspaces)
	$(NPM) run build

validate-env: ## Vérifie la configuration d'environnement (.env.example → .env)
	$(NPM) run validate-env

studio: ## Ouvre Prisma Studio (api-core)
	@if [ -d services/api-core ]; then cd services/api-core && npx prisma studio; else echo "api-core pas encore présent"; fi

clean: ## Nettoie les artefacts de build
	rm -rf packages/*/dist services/*/dist services/ledger/target node_modules
