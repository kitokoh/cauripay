# GOURSI — point d'entrée unique (GOURSI-003)
# Usage : make help
SHELL := /bin/bash
COMPOSE := docker compose

.PHONY: help install setup up down migrate migrate-java migrate-prisma seed test test-ts test-java lint format studio health logs reset audit audit-sql

help: ## Affiche l'aide
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-16s\033[0m %s\n", $$1, $$2}'

install: ## Installe les dépendances (npm workspaces)
	npm ci --no-audit --no-fund

setup: install up migrate seed ## Setup complet d'un poste dev vierge
	@echo "✔ Setup terminé — voir docs/ONBOARDING.md"

up: ## Démarre l'infrastructure (compose) + services en dev
	$(COMPOSE) up -d --build

down: ## Arrête tout
	$(COMPOSE) down

migrate: migrate-java migrate-prisma ## Exécute toutes les migrations (Flyway + Prisma)

migrate-java: ## Flyway (ledger-service)
	cd services/ledger-service && mvn -q flyway:migrate

migrate-prisma: ## Prisma migrate deploy (tous les services NestJS)
	@for d in services/*/; do \
	  if [ -f "$$d/prisma/schema.prisma" ]; then \
	    echo "→ prisma migrate deploy ($$d)"; \
	    (cd $$d && npx prisma migrate deploy); \
	  fi; \
	done

seed: ## Seed idempotent (Keycloak importé au boot ; données dev éventuelles)
	@echo "✔ Seed Keycloak : import auto via --import-realm (voir docker-compose.yml)"
	@if [ -f services/api-core/prisma/seed.ts ]; then (cd services/api-core && npx prisma db seed); fi

test: test-ts test-java ## Tests TS (jest) + tests Java (mvn)
test-ts: ## Tests Jest (tous les workspaces TS)
	npm run test
test-java: ## Tests Maven (ledger-service)
	cd services/ledger-service && mvn -q test

lint: ## ESLint + Prettier + typecheck TS
	npm run lint
	npm run typecheck

format: ## Prettier --write
	npm run format

studio: ## Prisma Studio (api-core)
	cd services/api-core && npx prisma studio

health: ## Vérifie la santé des conteneurs
	$(COMPOSE) ps

logs: ## Logs des conteneurs
	$(COMPOSE) logs -f

audit: audit-sql ## Audits de conformité (immutabilité + équilibre comptable)
audit-sql: ## Scripts d'audit SQL (GOURSI-QA2) — 0 écart requis
	@psql "$${LEDGER_DATABASE_URL}" -f scripts/audit/check_immutability.sql || echo "✘ IMMUTABILITÉ : le trigger doit lever 'Opération interdite' (attendu, cf. GOURSI-QA2)"
	@psql "$${LEDGER_DATABASE_URL}" -f scripts/audit/check_balance.sql

reset: ## ⚠️ Réinitialise TOUT (données locales détruites)
	@read -p "Confirmer la réinitialisation complète ? (taper RESET) " ans; \
	if [ "$$ans" = "RESET" ]; then $(COMPOSE) down -v && echo "✔ Reset effectué"; else echo "Annulé"; fi
