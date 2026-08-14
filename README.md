# 🌍 CauriPay — Plateforme wallet & agrégation de paiement pour l'Afrique

> **Une API.** Mobile money (Orange Money, MTN MoMo, Moov, Wave) + cartes + paiements internationaux,
> sur une **plateforme wallet multi-services** pensée pour l'Afrique centrale et de l'Ouest (UEMOA / CEMAC).

**Statut : Phase 0-1 (fondations & ledger) en cours** — l'ancien MVP sandbox v0.1 (agrégateur Fastify)
est archivé dans [`legacy/`](legacy/) ; la cible est le monorepo décrit ci-dessous
(voir [docs/REVUE-CONSTITUTION.md](docs/REVUE-CONSTITUTION.md) et [docs/DESIGN-v2.md](docs/DESIGN-v2.md)).

Le nom vient du **cauri**, coquillage utilisé comme monnaie en Afrique de l'Ouest pendant des siècles.

---

## 🏗 Architecture cible (monorepo)

```
cauripay/
├── packages/              Types & règles partagées (zero runtime deps)
│   ├── shared-types/      Enveloppes API, enums métier, contrats HTTP inter-services
│   └── validation-rules/  Limites KYC, calcul de frais, validation téléphone
├── services/              Services backend (microservices)
│   ├── ledger-service/    Java 21 + Spring Boot 3.2 — CŒUR COMPTABLE (seul à écrire les soldes)
│   ├── api-core/          NestJS — auth, wallets, transactions (orchestration)
│   ├── kyc-service/       NestJS — onboarding & documents marchands
│   ├── aml-service/       NestJS — scoring risque & listes OFAC/ONU/GABAC
│   ├── notification-service/ NestJS — SMS, email, Push FCM, WhatsApp
│   ├── ussd-service/      NestJS — opérations *123# (FR+AR)
│   ├── business-service/  NestJS — paiements marchands, webhooks, bulk
│   ├── reconciliation-service/ NestJS — rapprochement comptable journalier
│   └── developer-gateway/ NestJS — API publique, clés API, rate limiting
├── apps/                  Fronts & mobile
│   ├── web-admin/         Next.js — administration (Keycloak OIDC + RBAC)
│   ├── web-business/      Next.js — espace marchand (2FA)
│   ├── mobile-customer/   Flutter — portefeuille client (P2P, cash-in/out)
│   └── mobile-agent/      Flutter — agent (float, commissions)
├── infra/                 Infrastructure & déploiement
│   ├── docker/            Dockerfiles standardisés
│   ├── keycloak/          Realm seed idempotent
│   ├── rabbitmq/          Topologie exchanges/queues/bindings
│   ├── prometheus/        Scrape config
│   ├── grafana/           Dashboards provisionnés
│   └── compose/           Compose staging
├── docs/                  Documentation (spec, design, ADR, runbooks)
└── legacy/                MVP v0.1 archivé (agrégateur Fastify) — historique
```

### Blocs de livraison

| Bloc | Contenu | Issue de pilotage |
|---|---|---|
| **G0** | Fondation & infrastructure (monorepo, docker, CI, Keycloak, RabbitMQ, obs.) | #153 |
| **G1** | `ledger-service` Java (cœur comptable : transferAtomic, immutabilité, checkpoints) | #180 |
| **G2** | `api-core` + kyc/aml/notification/ussd (auth, wallets, P2P, cash-in/out) | #231 |
| **G3** | `business-service` + reconciliation (paiements marchands, bulk, rapprochement) | #232 |
| **G4** | Fronts & mobile (web-admin, web-business, mobile-customer, mobile-agent) | #269 |
| **G5** | Developer platform (developer-gateway, SDK JS/Flutter, docs) | #270 |
| **G6** | QA, sécurité & DoD (k6, ZAP, audits SQL, checklist 10 critères) | #271 |

## 🚀 Démarrage rapide

Prérequis : **Node ≥ 20**, **JDK 21**, **Maven 3.9**, **Docker** (optionnel pour l'infra).

```bash
git clone https://github.com/kitokoh/cauripay.git
cd cauripay
npm install          # workspaces npm
make up              # infrastructure (Postgres, Redis, RabbitMQ, Keycloak, Prometheus, Grafana)
make migrate         # Flyway (ledger) + Prisma (api-core)
make seed            # données de dev
make dev             # services en mode watch
```

Toutes les commandes d'équipe passent par le [Makefile](Makefile) — voir [docs/ONBOARDING.md](docs/ONBOARDING.md).

## 🧪 Tester

```bash
make test            # Jest (services TS) + Maven (ledger Java)
make test-java       # uniquement ledger-service
make lint            # ESLint + Prettier + tsc --noEmit sur tout le monorepo
```

## 🔒 Sécurité (principes)

- **Seul `ledger-service` écrit les soldes wallets** (règle absolue n°1 — spec §1.2).
- Montants en unités mineures entières / `Decimal`, **jamais de `number` flottant**.
- JWT **Keycloak RS256** (clients dédiés, rôles métier), `X-Service-Key` inter-services.
- Communications inter-services : réseau Docker interne ; secrets par environnement (jamais committés).
- Gitleaks + Trivy bloquent en CI (voir [.github/workflows/security-scan.yml](.github/workflows/security-scan.yml)).

## 📚 Documentation

- [docs/REVUE-CONSTITUTION.md](docs/REVUE-CONSTITUTION.md) — spec source de référence (exigences par bloc)
- [docs/DESIGN-v2.md](docs/DESIGN-v2.md) — dossier de conception cible
- [docs/ADR/](docs/ADR/) — décisions d'architecture (ADR-001…005)
- [docs/ONBOARDING.md](docs/ONBOARDING.md) — guide d'onboarding dev
- [docs/SECURITY.md](docs/SECURITY.md) — menaces & mitigations
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — déploiement staging/prod
- [docs/TRACABILITY.md](docs/TRACABILITY.md) — matrice spec ↔ issues
- [docs/DoD.md](docs/DoD.md) — checklist 10 critères (spec §8.5)

## 🤝 Contribuer

Voir [CONTRIBUTING.md](CONTRIBUTING.md) — conventions de branches (`feat/GOURSI-XXX-…`),
Conventional Commits, PR obligatoires, revue par les pairs.

## 📄 Licence

MIT — © 2026 kitokoh. Voir [LICENSE](LICENSE).
