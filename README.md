# 🐚 GOURSI — Plateforme wallet CauriPay

> **Monorepo de la plateforme wallet** : ledger comptable double écriture, wallet clients/agents/marchands,
> KYC/AML, paiement de factures, mobile money, USSD, back-offices et developer platform.
> Le nom vient du **cauri**, coquillage utilisé comme monnaie en Afrique de l'Ouest.

[![CI](https://github.com/kitokoh/cauripay/actions/workflows/ci.yml/badge.svg)](https://github.com/kitokoh/cauripay/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)


**Statut : Phase 0 — Fondation & Infrastructure** (voir [docs/DESIGN-v2.md](docs/DESIGN-v2.md)).
L'ancien agrégateur v0.1 est conservé en historique dans [`legacy/`](legacy/) (voir [ADR-002](docs/adr/ADR-002.md)).

## 🏗 Architecture cible

```
services/   9 services NestJS + ledger-service Java/Spring (ports 3000→3080)
apps/       web-admin (3001) · web-business (3002) · mobile-customer · mobile-agent (Flutter)
packages/   shared-types · validation-rules · payment-rail-contracts · js-sdk · flutter-sdk
infra/      Docker · Compose · Keycloak (realm goursi) · RabbitMQ (topologie)
```

| Service | Port | Stack | Rôle |
|---|---|---|---|
| api-core | 3000 | NestJS + Prisma | Auth, transactions, wallets |
| ledger-service | 3010 | Spring Boot 3.2 · Java 21 | Grand livre comptable (vérité financière) |
| business-service | 3020 | NestJS | Paiements marchands, rails, bulk, webhooks |
| kyc-service | 3030 | NestJS | KYC (documents chiffrés AES-256) |
| aml-service | 3040 | NestJS | Scoring AML, listes OFAC/ONU/GABAC, gel |
| notification-service | 3050 | NestJS | SMS, email, push FCM, WhatsApp |
| ussd-service | 3060 | NestJS | USSD *100# (sessions Redis) |
| reconciliation-service | 3070 | NestJS | Rapports COBAC quotidiens |
| developer-gateway | 3080 | NestJS | API publique devs, clés, sandbox |

Stack transverse : **PostgreSQL 16 · Redis 7 · RabbitMQ 3 · Keycloak (RS256) · Prometheus · Grafana**.

## 🚀 Quickstart monorepo

Prérequis : **Node 20 LTS** (`.nvmrc`), **JDK 21**, **Docker**.

```bash
git clone https://github.com/kitokoh/cauripay.git && cd cauripay
cp .env.example .env
make setup          # npm install + docker compose up + migrate + seed (une seule commande)
make health         # tous les services répondent ?
make test           # tests TS (jest) + tests Java (mvn)
```

Point d'entrée unique : [`Makefile`](Makefile) (voir `make help`).
Onboarding complet : [docs/ONBOARDING.md](docs/ONBOARDING.md).

## 🧭 Documentation

| Document | Contenu |
|---|---|
| [docs/DESIGN-v2.md](docs/DESIGN-v2.md) | Dossier de conception v2 (source de vérité) |
| [docs/REVUE-CONSTITUTION.md](docs/REVUE-CONSTITUTION.md) | Constitution du dépôt & migration |
| [docs/TRACABILITY.md](docs/TRACABILITY.md) | Matrice spec ↔ backlog (couverture Phase 0) |
| [docs/adr/](docs/adr/) | Décisions d'architecture (ADR-001…004) |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Procédure de déploiement & rollback |
| [docs/security/](docs/security/) | Rapports ZAP, audits SQL, secrets |

## ✅ Qualité & CI/CD

- **CI** (`.github/workflows/ci.yml`) : lint + tsc + jest (TS) **et** mvn test (Java) sur chaque PR.
- **Sécurité** (`.github/workflows/security-scan.yml`) : gitleaks (secrets) + trivy (images CRITICAL/HIGH).
- **DoD MVP 10/10** : checklist prouvée dans [docs/DESIGN-v2.md §8](docs/DESIGN-v2.md).
- Règles de contribution : [docs/REVUE-CONSTITUTION.md §4](docs/REVUE-CONSTITUTION.md).

## 📄 Licence

MIT — © 2026 kitokoh. Voir [LICENSE](LICENSE).
