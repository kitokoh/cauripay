# 🐚 CauriPay — Paiements & wallet pour l'Afrique

> Le nom vient du **cauri**, coquillage utilisé comme monnaie en Afrique de l'Ouest pendant des siècles.

[![CI](https://github.com/kitokoh/cauripay/actions/workflows/ci.yml/badge.svg)](https://github.com/kitokoh/cauripay/actions/workflows/ci.yml)
[![Licence MIT](https://img.shields.io/badge/licence-MIT-green)](/LICENSE)
[![Node ≥ 22.5](https://img.shields.io/badge/Node-%E2%89%A522.5-339933?logo=node.js&logoColor=white)](package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](#)

Ce dépôt héberge **deux volets** :

| Volet | Statut | Code | Docs |
|---|---|---|---|
| **CauriPay — agrégateur de paiement dev-first** (API type Stripe, mobile money, checkout, webhooks) | ✅ **v0.1 livrée** (mode sandbox) — v0.2 en cours | `server/` + `dashboard/` | [docs/DESIGN.md](docs/DESIGN.md) (source de vérité) · [docs/API.md](docs/API.md) |
| **GOURSI — plateforme wallet** (ledger, wallets, KYC/AML, USSD, mobile) | 🚧 Vision v2 (Phase 0 — [ADR-002](docs/adr/ADR-002.md) à valider par le propriétaire) | à construire | [docs/DESIGN-v2.md](docs/DESIGN-v2.md) · [docs/adr/](docs/adr/) · [docs/TRACABILITY.md](docs/TRACABILITY.md) |

> **Statut courant : la v0.1 de CauriPay (sandbox) est livrée et testable** — aucun argent réel ne transite.
> Le backlog GitHub est la source opérationnelle (labels `prio:*`, `parallel`, milestones).

---

## ✨ CauriPay — ce que fait le MVP v0.1

| Fonctionnalité | Détail |
|---|---|
| **API REST v1** (type Stripe) | Création/lecture/liste/annulation de paiements, idempotence, clés `pk_/sk_` test & live |
| **Sandbox complet** | Simulateur de providers fidèle aux flux réels (téléphone → PIN → succès/échec) — aucun argent réel |
| **Checkout hébergée** | Page de paiement prête à l'emploi : `GET /checkout/ck_…` |
| **Webhooks** | Événements `payment.*`, signature **HMAC-SHA256**, retries avec backoff, journal des tentatives, rejeu |
| **Dashboard React** | Vue d'ensemble, paiements, simulateur sandbox, webhooks, clés API, réglages |
| **Devises & méthodes** | XOF, XAF, GNF, CDF, NGN, GHS, EUR, USD × orange_money, mtn_momo, moov_money, wave, card, international |

## 🚀 Démarrage rapide (2 minutes)

Prérequis : **Node.js ≥ 22.5** (SQLite intégré, aucune autre dépendance système).

```bash
git clone https://github.com/kitokoh/cauripay.git
cd cauripay
npm install
npm run dev
```

- **Dashboard** → http://localhost:5173 (ou http://localhost:4000 après build)
- **API** → http://localhost:4000 · **Santé** → http://localhost:4000/health

Créez un compte marchand, copiez votre `sk_test_…` depuis **Clés API**, et :

```bash
# 1. Créer un paiement
curl -X POST http://localhost:4000/api/v1/payments \
  -H "Authorization: Bearer sk_test_xxx" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: cmd-001" \
  -d '{"amount_minor":25000,"currency":"XOF",
       "methods":["orange_money","mtn_momo","wave","card"],
       "description":"Abonnement Premium"}'

# 2. Ouvrir checkout_url dans le navigateur, saisir un numéro + PIN → succès (PIN 0000 = échec)

# 3. Simuler une issue côté API (sk_test uniquement)
curl -X POST http://localhost:4000/api/v1/sandbox/payments/pay_xxx/approve \
  -H "Authorization: Bearer sk_test_xxx"

# 4. Recevoir l'événement payment.succeeded sur votre webhook
#    Header : X-CauriPay-Signature: t=<unix>,v1=<hmac-sha256(secret, "t.payload")>
```

En production : `npm run build && npm start` (le serveur sert l'API **et** le dashboard sur le port 4000),
ou conteneurisé : `docker compose up --build` (voir [Dockerfile](Dockerfile)).

## 🧪 Tester

```bash
npm run check     # lint + build + tests (DoD)
npm test          # tests E2E : auth, paiements, idempotence, sandbox, checkout, webhooks signés
```

## 🏗 Architecture (volet CauriPay)

```
cauripay/
├── server/        Fastify 5 + TypeScript + node:sqlite (zéro dépendance native)
│   ├── src/       API marchand (/api), API développeur (/api/v1), checkout (/checkout),
│   │              simulateur sandbox, dispatcher webhooks (HMAC + retries)
│   └── test/      tests E2E (node:test)
├── dashboard/     React 18 + Vite + TypeScript (SPA, design system maison)
├── packages/      libs partagées (registres devises/méthodes — source de vérité)
└── docs/          DESIGN.md (conception), API.md (référence), ROADMAP.md
```

## 📚 Documentation

**CauriPay** : [docs/DESIGN.md](docs/DESIGN.md) (source de vérité) · [docs/API.md](docs/API.md) · [docs/ROADMAP.md](docs/ROADMAP.md)
**GOURSI** : [docs/DESIGN-v2.md](docs/DESIGN-v2.md) · [docs/REVUE-CONSTITUTION.md](docs/REVUE-CONSTITUTION.md) · [docs/adr/](docs/adr/) · [docs/TRACABILITY.md](docs/TRACABILITY.md)

## 🤝 Contribuer

Le dépôt est conçu pour que **plusieurs développeurs travaillent en parallèle** :
branches feature → PR → CI (lint, typecheck, tests, scan secrets) → squash merge sur `main` protégé.
Voir [CONTRIBUTING.md](CONTRIBUTING.md) pour le workflow, les labels et la Definition of Done,
et [SECURITY.md](SECURITY.md) pour signaler une vulnérabilité.

## 🔒 Sécurité (v0.1)

- Mots de passe hachés (scrypt natif), JWT 7 jours pour le dashboard
- Clés `sk_` **hachées au repos** — valeur en clair renvoyée une seule fois (création/rotation)
- Webhooks signés HMAC-SHA256 (`t + "." + body`), anti-replay ±5 min, anti-SSRF en production
- **Aucune donnée de carte stockée** (méthode `card` simulée) — posture PCI-DSS par conception
- Rate limiting **par clé API** sur /api/v1

## 📄 Licence

MIT — © 2026 kitokoh. Voir [LICENSE](LICENSE).
