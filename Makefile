# =============================================================================
# CauriPay — Makefile unifié
# Point d'entrée unique pour toutes les commandes d'équipe (TS + Java).
# =============================================================================

SHELL := /bin/bash
.DEFAULT_GOAL := help

LEDGER_DIR := services/ledger-service

.PHONY: help install up down migrate seed dev test test-java test-ts lint \
        format studio health logs reset build

help: ## Affiche l'aide
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-12s\033[0m %s\n", $$1, $$2}'

install: ## Installe les dépendances (npm racine + workspaces)
	npm install

up: ## Démarre l'infrastructure locale (docker compose)
	docker compose up -d
	@echo "→ Postgres :5432, Redis :6379, RabbitMQ :15672, Keycloak :8080, Prometheus :9090, Grafana :3001"

down: ## Arrête l'infrastructure (données conservées)
	docker compose down

migrate: ## Applique les migrations (Flyway ledger + Prisma api-core)
	cd $(LEDGER_DIR) && mvn -B flyway:migrate
	npm run migrate --workspace services/api-core --if-present

seed: ## Charge les données de dev (Keycloak, RabbitMQ, seed api-core)
	@echo "→ Seed Keycloak (realm goursi) via import au démarrage du conteneur"
	@if [ -f infra/rabbitmq/init-topology.js ]; then \
		docker compose exec -T rabbitmq node /init-topology.js 2>/dev/null || \
		echo "→ Topologie RabbitMQ déclarée au démarrage du conteneur (voir infra/rabbitmq)"; \
	fi
	npm run seed --workspace services/api-core --if-present

dev: ## Démarre les services en mode watch (dev)
	docker compose --profile dev up -d
	npm run start:dev --workspaces --if-present

build: ## Build de tous les workspaces + ledger
	npm run build --workspaces --if-present
	cd $(LEDGER_DIR) && mvn -B -q clean package -DskipTests

test: test-ts test-java ## Lance tous les tests (TS + Java)

test-ts: ## Tests Jest de tous les workspaces TS
	npm test --workspaces --if-present

test-java: ## Tests Maven du ledger-service
	cd $(LEDGER_DIR) && mvn -B test

lint: ## ESLint + Prettier + tsc --noEmit
	npm run lint
	npm run format:check
	npm run typecheck

format: ## Formate le code (Prettier)
	npm run format:write

studio: ## Ouvre Prisma Studio sur api-core
	npm run studio --workspace services/api-core --if-present

health: ## Vérifie la santé de l'infra
	docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Health}}"

logs: ## Logs de l'infra
	docker compose logs -f --tail=100

reset: ## ⚠️  Reset complet (supprime les volumes Docker)
	@echo "⚠️  ATTENTION : cette commande supprime TOUTES les données locales (volumes Docker)."
	@read -p "Taper 'reset' pour confirmer : " ans; \
	if [ "$$ans" = "reset" ]; then docker compose down -v; else echo "Annulé."; fi
