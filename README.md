# 🐚 CauriPay (GOURSI) — Plateforme wallet dev-first pour l'Afrique

[![CI](https://github.com/kitokoh/cauripay/actions/workflows/ci.yml/badge.svg)](https://github.com/kitokoh/cauripay/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> **Monorepo de la plateforme wallet** : ledger comptable double écriture, wallets clients/agents/marchands,
> KYC/AML, paiement de factures, mobile money, USSD, back-offices et developer platform.
> Le nom vient du **cauri**, coquillage utilisé comme monnaie en Afrique de l'Ouest pendant des siècles.

| Brique | Statut |
|---|---|
| **v0.1 — Sandbox MVP** (agrégateur : API REST, simulateur, checkout, webhooks, dashboard) | ✅ Livré — conservé dans `apps/` comme **référence historique** (`apps/api-mvp`, `apps/dashboard`) |
| **Plateforme wallet** (blocs G0→G6 : ledger Java, api-core NestJS, KYC/AML, business, fronts, SDK) | 🚧 En construction — piloté par les issues `GOURSI-*` (milestones G0…G6) |

> ℹ️ **La cible du projet est la plateforme wallet** (voir [docs/REVUE-CONSTITUTION.md](docs/REVUE-CONSTITUTION.md)).
> L'agrégateur v0.1 reste fonctionnel mais n'est **pas** l'architecture cible (décision : [ADR-002](docs/ADR/adr-002-coeur-produit.md)).

## 🏗 Architecture cible

```
services/   api-core (3000) · ledger-service Java (3010) · business (3020) · kyc (3030)
            aml (3040) · notification (3050) · ussd (3060) · reconciliation (3070) · dev-gateway (3080)
apps/       web-admin (3001) · web-business (3002) · mobile-customer · mobile-agent (Flutter)
packages/   shared-types · validation-rules · payment-rail-contracts · js-sdk · flutter-sdk
infra/      Docker · Compose · Keycloak (realm goursi) · RabbitMQ (topologie) · Prometheus · Grafana
```

| Service | Port | Stack | Rôle |
|---|---|---|---|
| api-core | 3000 | NestJS + Prisma | Auth, transactions, wallets (orchestrateur) |
| ledger-service | 3010 | Spring Boot 3.2 · Java 21 | Grand livre comptable (vérité financière) |
| business-service | 3020 | NestJS | Paiements marchands, rails, bulk, webhooks |
| kyc-service | 3030 | NestJS | Vérification d'identité (documents chiffrés AES-256) |
| aml-service | 3040 | NestJS | Scoring AML, listes OFAC/ONU/GABAC, gel |
| notification-service | 3050 | NestJS | SMS, email, push FCM, WhatsApp |
| ussd-service | 3060 | NestJS | USSD *100# (sessions Redis) |
| reconciliation-service | 3070 | NestJS | Rapports COBAC quotidiens, CSV/PDF |
| developer-gateway | 3080 | NestJS | API publique devs, clés, sandbox |

Stack transverse : **PostgreSQL 16 · Redis 7 · RabbitMQ 3 · Keycloak (RS256) · Prometheus · Grafana**.

## 🚀 Quickstart monorepo

Prérequis : **Node 22 LTS** (`.nvmrc`), **JDK 21 + Maven 3.9**, **Docker** (plugin compose).

```bash
git clone https://github.com/kitokoh/cauripay.git && cd cauripay
make install        # npm install + dépendances Maven
make up             # Postgres 16 · Redis · RabbitMQ · Keycloak · Prometheus · Grafana
make migrate        # Flyway (ledger) + Prisma (api-core)
make seed           # Realm Keycloak + topologie RabbitMQ
make test           # tests TS (jest) + tests Java (mvn) — porte d'entrée CI
```

| Service | URL |
|---|---|
| API v0.1 (sandbox, historique) | http://localhost:4000 |
| Dashboard v0.1 | http://localhost:5173 |
| Keycloak | http://localhost:8080 |
| RabbitMQ management | http://localhost:15672 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3000 |

Point d'entrée unique : [`Makefile`](Makefile) (voir `make help`).

## 🧪 Tester

```bash
make test           # tout le monorepo (TS + Java)
make test-java      # uniquement ledger-service (mvn test)
make lint           # eslint + prettier + tsc --noEmit (+ checkstyle/spotbugs Java)
```

## 📚 Documentation

| Document | Contenu |
|---|---|
| [docs/DESIGN-v2.md](docs/DESIGN-v2.md) | Dossier de conception v2 (**source de vérité**) |
| [docs/REVUE-CONSTITUTION.md](docs/REVUE-CONSTITUTION.md) | Constitution du dépôt (vision, arborescence, règles) |
| [docs/TRACABILITY.md](docs/TRACABILITY.md) | Matrice spec ↔ backlog |
| [docs/adr/](docs/adr/README.md) | Décisions d'architecture (ADR-001…007) |
| [docs/ADR/](docs/ADR/) | Décisions d'architecture (ADR-001…005) |
| [docs/SECURITY.md](docs/SECURITY.md) | Modèle de menace & gestion des secrets |
| [docs/DESIGN.md](docs/DESIGN.md) | Conception v0.1 (agrégateur — historique) |
| [docs/API.md](docs/API.md) | Référence API v1 (v0.1) |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Feuille de route produit |

## ✅ Qualité & CI/CD

- **CI** (`.github/workflows/ci.yml`) : tests + builds, typecheck, scan secrets (gitleaks) + audit npm, sur chaque PR.
- **DoD MVP 10/10** : checklist prouvée dans [docs/DESIGN-v2.md §8](docs/DESIGN-v2.md).
- Règles de contribution : [docs/REVUE-CONSTITUTION.md §11](docs/REVUE-CONSTITUTION.md).

## 🤝 Contribuer

Le dépôt est pensé pour le **travail en équipe** : `main` protégé, CI obligatoire,
issues pilotées par milestones (G0…G6), templates d'issues et de PR.
Lisez [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md) avant de commencer.

## 🔒 Sécurité

- Secrets jamais commités — gitleaks en CI (0 finding exigé)
- Communications inter-services authentifiées (`X-Service-Key`, temps constant)
- Webhooks signés HMAC-SHA256, anti-SSRF
- **Aucune donnée de carte stockée** — posture PCI-DSS par conception

Voir [docs/SECURITY.md](docs/SECURITY.md).

## 📄 Licence

MIT — © 2026 kitokoh. Voir [LICENSE](LICENSE).
