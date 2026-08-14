# REVUE-CONSTITUTION — Constitution du dépôt (revue de conception)

> Date : 2026-08-14 · Statut : **approuvée** (Phase 0) · Référence : backlog GOURSI (issues #138–#271)

## 1. État actuel (constat)

Le dépôt `cauripay` contient **l'agrégateur v0.1 sandbox** :

```
cauripay/
├── server/        Fastify 5 + TS + node:sqlite (API marchand, checkout, webhooks, simulateur)
├── dashboard/     React 18 + Vite (SPA marchand)
├── docs/          DESIGN.md (v0.1), API.md, ROADMAP.md
└── package.json   npm workspaces [server, dashboard]
```

Constats :
- ✅ Monorepo npm workspaces déjà en place ; ✅ tests E2E ; ✅ CI GitHub Actions de base ; ✅ .env.example.
- ❌ Pas de Postgres/Redis/RabbitMQ/Keycloak ; ❌ pas de ledger ; ❌ pas de packages partagés ;
  ❌ pas de CI Java ; ❌ pas de scan sécurité ; ❌ pas d'onboarding automatisé.

## 2. Constitution cible (Phase 0 → livrable monorepo GOURSI)

```
cauripay/
├── services/                  # services NestJS (workspaces npm) + ledger-service (Maven)
│   ├── api-core/              #   port 3000
│   ├── ledger-service/        #   Spring Boot 3.2, Java 21, port 3010 (PAS de workspace npm)
│   ├── business-service/      #   port 3020
│   ├── kyc-service/           #   port 3030
│   ├── aml-service/           #   port 3040
│   ├── notification-service/  #   port 3050
│   ├── ussd-service/          #   port 3060
│   ├── reconciliation-service/#   port 3070
│   └── developer-gateway/     #   port 3080
├── apps/                      # fronts (workspaces npm)
│   ├── web-admin/             #   Next.js, port 3001
│   ├── web-business/          #   Next.js, port 3002
│   ├── mobile-customer/       #   Flutter 3.22
│   └── mobile-agent/          #   Flutter 3.22
├── packages/                  # packages partagés (workspaces npm)
│   ├── shared-types/          #   enveloppes, enums, contrats HTTP (0 dépendance)
│   ├── validation-rules/      #   frais, limites KYC, téléphone (decimal.js)
│   ├── payment-rail-contracts/#   contrat IRailAdapter (G3)
│   ├── js-sdk/                #   @goursi/js-sdk (G5)
│   └── flutter-sdk/           #   goursi_flutter (G5)
├── infra/
│   ├── docker/                #   Dockerfile.nestjs, Dockerfile.java, .dockerignore
│   ├── compose/               #   compose.yml, compose.override.yml, compose.staging.yml
│   ├── keycloak/              #   realm-export.json (realm goursi, RS256, rôles)
│   └── rabbitmq/              #   topologie (exchanges/queues/bindings idempotents)
├── docs/                      # DESIGN-v2, REVUE-CONSTITUTION, TRACABILITY, adr/, API, DEPLOYMENT, ONBOARDING, security/
├── legacy/                    # ⚠ v0.1 agrégateur conservé en HISTORIQUE (server/, dashboard/, docs v0.1)
├── scripts/                   # setup-check.sh, audit-sql, seed
├── tests/
│   ├── load/                  #   k6 (p2p-1000tpm.js)
│   └── security/              #   zap-baseline
├── Makefile                   # point d'entrée unique (install/up/down/migrate/seed/test/lint/audit)
├── .github/workflows/         # ci.yml, security-scan.yml, deploy-staging.yml
├── .env.example · .env.test.example
├── .nvmrc (20) · tsconfig.base.json · .gitleaks.toml
└── package.json               # workspaces = [services/*, apps/*, packages/*]
```

## 3. Écarts & décisions de migration

| # | Écart | Décision | Référence |
|---|---|---|---|
| 1 | Le v0.1 (agrégateur) n'est pas la cible produit | **Conservé en `legacy/` (historique)** ; les issues de son backlog sortent du périmètre actif | ADR-002 |
| 2 | kyc/aml logés dans api-core par l'ancien catalogue | **Services dédiés** (tableau architecture §1.1 prime) | ADR-001 |
| 3 | Création du wallet | **Créé à l'inscription** (BASIC), dans la même `$transaction` | ADR-003 |
| 4 | Ports ambigus | **Convention de ports** fixée (table §2 de DESIGN-v2) | ADR-004 |
| 5 | Spec non versionnée dans le dépôt | **Design dossier v2 = source de vérité** (docs/DESIGN-v2.md) + matrice de traçabilité | DESIGN-v2, TRACABILITY |

## 4. Règles de constitution (binding pour tout contributeur)

1. **Branches** : `feat/GOURSI-XXX-description`, `fix/…`, `docs/…` — jamais de commit direct sur `main`.
2. **Conventional Commits** avec scope : `feat(GOURSI-001): …`.
3. **CI verte obligatoire** avant merge (lint + tsc + jest + mvn test + gitleaks + trivy).
4. **PR** : titre = clé GOURSI, corps = contexte + tests + preuve d'acceptation, `Closes #n`.
5. **1 service = 1 workspace** (NestJS) ; ledger-service hors workspaces npm (Maven).
6. **DoD MVP** : les 10 critères de DESIGN-v2 §8 sont vérifiés par des preuves commitées (tests/rapports).
7. **Toute correction de migration** = nouvelle migration V{n+1}, jamais d'édition des V appliquées.

---

_Liens : [DESIGN-v2.md](DESIGN-v2.md) · [TRACABILITY.md](TRACABILITY.md) · [adr/](adr/)_
