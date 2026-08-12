# 🌍 CauriPay — Agrégateur de paiement dev-first pour l'Afrique

> **Une API.** Mobile money (Orange Money, MTN MoMo, Moov, Wave) + cartes + paiements internationaux.
> Pensé pour l'Afrique centrale et de l'Ouest (UEMOA / CEMAC).

**Statut : MVP v0.1 — mode sandbox complet** (aucune transaction réelle, aucune licence requise pour l'exploiter).

Le nom vient du **cauri**, coquillage utilisé comme monnaie en Afrique de l'Ouest pendant des siècles.

---

## ✨ Ce que fait le MVP

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
- **API** → http://localhost:4000
- **Santé** → http://localhost:4000/health

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

# → { "payment": { "id": "pay_…", "status": "pending",
#                  "checkout_url": "http://localhost:4000/checkout/ck_…", … } }

# 2. Ouvrir checkout_url dans le navigateur, saisir un numéro + PIN → succès
#    (PIN 0000 simule un échec)

# 3. Simuler une issue côté API (sk_test uniquement)
curl -X POST http://localhost:4000/api/v1/sandbox/payments/pay_xxx/approve \
  -H "Authorization: Bearer sk_test_xxx"

# 4. Recevoir l'événement payment.succeeded sur votre webhook
#    Header : X-CauriPay-Signature: t=<unix>,v1=<hmac-sha256(secret, "t.payload")>
```

### Recevoir des webhooks en local

Utilisez un tunnel type [webhook.site](https://webhook.site) ou [ngrok](https://ngrok.com),
puis ajoutez l'URL dans **Dashboard → Webhooks**. Le secret de signature vous est affiché une seule fois.

## 🧪 Tester

```bash
npm test          # 10 tests E2E : auth, paiements, idempotence, sandbox,
                  # checkout complet, webhooks signés (HMAC vérifié)
```

## 🏗 Architecture

```
cauripay/
├── server/        Fastify 5 + TypeScript + node:sqlite (zéro dépendance native)
│   ├── src/       API marchand (/api), API développeur (/api/v1), checkout (/checkout)
│   │              simulateur sandbox, dispatcher webhooks (HMAC + retries)
│   └── test/      tests E2E (node:test)
├── dashboard/     React 18 + Vite + TypeScript (SPA, design system maison)
└── docs/          DESIGN.md (conception complète), API.md (référence), ROADMAP.md
```

En production, `npm run build && npm start` : le serveur sert l'API **et** le dashboard compilé sur le port 4000.

## 📚 Documentation

- [docs/DESIGN.md](docs/DESIGN.md) — dossier de conception (vision, marché, sécurité, conformité, monétisation)
- [docs/API.md](docs/API.md) — référence API v1 complète
- [docs/ROADMAP.md](docs/ROADMAP.md) — v0.1 → v0.4 (vrais PSP, SDK mobile, reversements, agréments)

## 🔒 Sécurité (v0.1)

- Mots de passe hachés (scrypt), JWT 7 jours pour le dashboard
- Clés secrètes renvoyées uniquement au marchand authentifié (comme Stripe)
- Webhooks signés HMAC-SHA256 (`t + "." + body`), anti-replay ±5 min
- **Aucune donnée de carte stockée** (méthode `card` simulée) — posture PCI-DSS par conception
- Rate limiting global (@fastify/rate-limit)

## 🗺 Vers la production (v0.2)

Brancher les vrais PSP via l'interface provider du simulateur : Orange Money API, MTN MoMo API,
CinetPay, Flutterwave, Thunes (international) → mode live → KYC/AML → agréments BCEAO/COBAC.
Voir [docs/ROADMAP.md](docs/ROADMAP.md).

## 📄 Licence

MIT — © 2026 kitokoh. Voir [LICENSE](LICENSE).
