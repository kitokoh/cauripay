# CauriPay — Dossier de conception v0.1

> Agrégateur de paiement dev-first pour l'Afrique centrale et de l'Ouest.
> Statut : **validé — v0.1 livrée (sandbox), v0.2 en cours (connecteurs PSP)**.
> Date : 2026-08-11 · Auteur : agent MoClaw, pour kitokoh · Dernière révision : 2026-08-14
> Ce document est la **source de vérité** produit/architecture. Les décisions §16 sont validées ; toute remise en cause passe par une nouvelle issue + ADR.

---

## 1. Synthèse exécutive

**CauriPay** (nom de travail — *cauri* = coquillage monnaie historique d'Afrique de l'Ouest) est une plateforme qui permet à n'importe quel développeur d'accepter des paiements en quelques minutes : **mobile money** (Orange Money, MTN MoMo, Moov, Wave), **cartes** (Visa/Mastercard) et **paiements internationaux**, via **une API unique** de type Stripe, avec un **mode sandbox complet** pour développer sans risquer d'argent réel.

Le MVP v0.1 est un **agrégateur en mode test** : aucune transaction financière réelle (aucune licence requise pour l'exploiter), mais une architecture production-ready — clés API, webhooks signés, idempotence, simulateur de providers — prête à brancher les vrais PSP (Orange Money API, MTN MoMo API, CinetPay, Flutterwave, Thunes…) en v0.2.

**Le créneau** : Paystack (Nigeria/Ghana) et Flutterwave excellent sur l'anglophone et les cartes ; CinetPay couvre l'UEMOA mais avec une DX datée. **Personne ne combine** DX type Stripe + mobile money UEMOA/CEMAC natif + international + SDK mobile. C'est la fenêtre.

---

## 2. Problème & marché

### 2.1 Faits (sources : recherches 2026-08-11, cf. findings.md)
- Mobile money Afrique de l'Ouest : **~498 Mds USD de transactions en 2025**, 517 M+ comptes.
- UEMOA : Orange Money mène (~38 % valeur), **Wave progresse fortement** (19→23 %), MTN MoMo recule.
- Afrique : > 1 000 Mds USD de transactions mobile money en 2024 (+15 % YoY).
- La carte bancaire reste marginale pour la majorité de la population ; **le mobile money est le moyen de paiement dominant**.

### 2.2 Problème des développeurs aujourd'hui
1. **Fragmentation** : chaque pays / opérateur a son API (Orange Money API, MTN MoMo API, Wave…), ses formats, sa doc, sa sandbox. Intégrer 3 pays = 3 intégrations.
2. **Pas de DX moderne** : les agrégateurs francophones ont des dashboards datés, une doc faible, pas de SDK propres.
3. **International** : vendre à un client en Europe/Amérique depuis l'Afrique de l'Ouest est complexe (cartes, devises, frais).
4. **Mobile** : les SDK mobile (React Native/Flutter) des acteurs locaux sont rares ou inutilisables.

### 2.3 Solution
Une seule API (REST, clés `sk_/pk_`), une checkout page hébergée, des webhooks signés, un simulateur sandbox fidèle aux flux réels (saisie téléphone → PIN → confirmation), des SDK (JS/TS d'abord, mobile ensuite), et un dashboard complet. Le paiement devient un problème résolu en 10 lignes de code.

---

## 3. Public cible & personas

| Persona | Besoin | Ce que CauriPay lui apporte |
|---|---|---|
| **Dev SaaS/e-commerce francophone** (Abidjan, Douala, Dakar) | Accepter Orange Money / MTN MoMo / Wave sans cauchemar | API + SDK + checkout hébergée + webhooks |
| **Startup fintech** (portefeuilles, neobank) | Paiements en masse, webhooks fiables, reversements | API solide, idempotence, événements, ledger (v0.3) |
| **Éditeur vendant à l'international** | Encaisser EUR/USD depuis l'Afrique | Support cartes + international dès v0.1 |
| **Dev mobile** (Flutter/RN) | Payer depuis une app | SDK mobile (v0.3), deep links |

---

## 4. Périmètre

### 4.1 Inclus dans le MVP v0.1 (sandbox complet, aucun argent réel)
- Onboarding marchand (inscription, JWT), gestion de profil.
- **Clés API** : `pk_test_*`, `sk_test_*`, `pk_live_*`, `sk_live_*` + secrets webhook par mode. Rotation des clés.
- **API v1** : création/lecture/liste/annulation de paiements, **idempotence**, checkout_url.
- **Méthodes simulées** : `orange_money`, `mtn_momo`, `moov_money`, `wave`, `card`, `international`.
- **Devises** : XOF, XAF, GNF, CDF, NGN, GHS, EUR, USD (décimales ISO 4217).
- **Simulateur sandbox** : endpoints `POST /api/v1/sandbox/payments/:id/approve|fail|expire` (sk_test uniquement).
- **Page checkout hébergée** : flux réaliste mobile money (téléphone → PIN → succès/échec), testable sans argent.
- **Webhooks** : configuration d'endpoint, événements, **signature HMAC**, retries avec backoff, journal des tentatives, rejeu.
- **Dashboard React** : vue d'ensemble (statistiques), paiements (liste + détail + timeline), webhooks, clés, réglages.
- **Docs** : README, référence API complète, guide de démarrage, roadmap.
- **Tests E2E** automatiques du parcours complet.

### 4.2 Hors périmètre v0.1 (roadmap)
- Argent réel, connexions aux vrais PSP/opérateurs (v0.2), SDK mobile (v0.3), reversements/payouts & ledger (v0.3), KYC/AML automatisé (v0.2+), dashboard multi-utilisateurs/équipes (v0.3), plugins e-commerce (WooCommerce, PrestaShop — v0.3).

---

## 5. Concepts produit (vocabulaire commun)

- **Marchand** : compte entreprise (une ou plusieurs clés, webhooks, statistiques).
- **Paiement** : intention de paiement unique (`pay_*`), porteur d'un montant, d'une devise, de méthodes acceptées et d'un état.
- **Méthode/provider** : canal de paiement (Orange Money = provider `orange_money`).
- **Mode** : `test` (simulateur, aucun argent) vs `live` (verrouillé en v0.1, activé avec les vrais PSP).
- **Événement** : fait factuel sur un paiement (`payment.succeeded`…) — alimente la timeline et les webhooks.
- **Webhook** : notification HTTP sortante signée vers un endpoint du marchand.

---

## 6. Architecture technique

```
┌─────────────────────────────────────────────────────────────┐
│  dashboard/  React 18 + Vite + TS (SPA, port 5173)          │
│  ─ proxy /api → server ──────────────────────────────────── │
├─────────────────────────────────────────────────────────────┤
│  server/  Fastify 5 + TypeScript (port 4000)                │
│  ├── /api/*        API marchand (auth JWT, clés, webhooks)  │
│  ├── /api/v1/*     API développeur (paiements, sandbox)     │
│  └── /checkout/*   pages checkout publiques (HTML servi)    │
│  ├── simulator/    providers simulés (machine à états)      │
│  └── webhooks/     dispatcher : HMAC + retries + journal    │
├─────────────────────────────────────────────────────────────┤
│  db: node:sqlite (fichier local, zéro dépendance native)    │
│      → Postgres en prod (interface repository à isoler)     │
└─────────────────────────────────────────────────────────────┘
```

- **Monorepo npm workspaces** : `server/`, `dashboard/`, `docs/`, `packages/` (libs partagées : registres devises/méthodes, types — source de vérité unique, évite la dérive dashboard/serveur).
- **Pourquoi Fastify** : performant, schémas JSON natifs (validation), écosystème propre.
- **Pourquoi node:sqlite** (Node ≥ 22.5) : zéro dépendance native, démarrage immédiat pour l'utilisateur ; remplaçable par Postgres via une couche d'accès unique (`src/db.ts`).
- **Pas de framework UI lourd** côté dashboard : React + CSS custom (design tokens) → moins de dépendances, plus rapide à démarrer.
- **Run local** : `npm install` puis `npm run dev` (server 4000 + dashboard 5173). Une commande root dédiée.

---

## 7. Modèle de données (v0.1)

```sql
merchants(
  id TEXT PK, name, company, email UNIQUE, password_hash,
  pk_test, sk_test_hash, pk_live, sk_live_hash,   -- sk_ jamais en clair (sha256)
  wsec_test, wsec_live, live_enabled INTEGER DEFAULT 0,
  created_at, updated_at
)

payments(
  id TEXT PK ('pay_' + nanoid), merchant_id FK,
  amount_minor INTEGER,            -- unité mineure (ISO 4217)
  currency TEXT,                   -- XOF, XAF, EUR…
  methods TEXT(JSON),              -- ["orange_money","card"]
  status TEXT,                     -- pending|processing|succeeded|failed|cancelled|expired
  provider TEXT NULL,              -- méthode choisie au checkout
  provider_ref TEXT NULL,          -- ref simulée "SIM-xxxx"
  phone TEXT NULL,                 -- numéro mobile money
  description TEXT, metadata TEXT(JSON), redirect_url TEXT,
  idempotency_key TEXT NULL,       -- UNIQUE(merchant_id, idempotency_key)
  mode TEXT DEFAULT 'test',        -- test|live
  checkout_token TEXT UNIQUE,
  created_at, updated_at
)

events(
  id TEXT PK, payment_id FK, type TEXT,
  data TEXT(JSON), created_at      -- timeline + source des webhooks
)

webhooks(
  id TEXT PK, merchant_id FK, url TEXT,
  events TEXT(JSON),               -- ["*"] ou ["payment.succeeded",…]
  mode TEXT, secret TEXT, active INTEGER DEFAULT 1,
  created_at
)

webhook_attempts(
  id TEXT PK, webhook_id FK, event_id FK,
  payload TEXT(JSON), signature TEXT,
  status TEXT,                     -- delivered|failed
  http_status INTEGER NULL,
  attempts INTEGER DEFAULT 0, next_retry_at INTEGER NULL,
  last_error TEXT NULL, created_at, delivered_at
)
```

Contraintes clés : `UNIQUE(merchant_id, idempotency_key)` (idempotence) ; montants en **unités mineures entières** (jamais de float) ; **aucune donnée de carte** stockée (posture PCI-DSS).

---

## 8. Machine à états du paiement

```
                ┌─────────┐  cancel   ┌────────────┐
  create ─────▶ │ pending │─────────▶ │ cancelled  │
                └────┬────┘           └────────────┘
                     │ initiate (checkout) / sandbox.approve
                     ▼
                ┌────────────┐  ┌────────────┐
                │ processing │─▶│ succeeded  │   (simulateur ~1,5 s)
                └─────┬──────┘  └────────────┘
                      │ fail / expire / PIN erroné
                      ▼
                ┌──────────┐   ┌─────────┐
                │  failed  │   │ expired │
                └──────────┘   └─────────┘
```

Transitions valides : `pending→processing→succeeded|failed` ; `pending→cancelled` ; `processing→failed|expired`. Toute autre transition = 409. Chaque transition émet un **événement** (`payment.created`, `payment.processing`, `payment.succeeded`, `payment.failed`, `payment.cancelled`, `payment.expired`) → timeline + webhooks.

---

## 9. Contrat API v1 (résumé — détail complet : `docs/API.md`)

Base : `http://localhost:4000` · Auth API développeur : `Authorization: Bearer sk_test_…` (ou `pk_` en lecture).

| Méthode | Route | Rôle |
|---|---|---|
| POST | `/api/v1/payments` | Créer un paiement (montant, devise, méthodes, metadata, redirect_url, idempotency_key) → `checkout_url` |
| GET | `/api/v1/payments?status=&limit=&before=` | Lister (curseur) |
| GET | `/api/v1/payments/:id` | Détail + timeline |
| POST | `/api/v1/payments/:id/cancel` | Annuler (pending) |
| POST | `/api/v1/sandbox/payments/:id/approve` | **Simulateur** : succès (sk_test only) |
| POST | `/api/v1/sandbox/payments/:id/fail` | **Simulateur** : échec |
| POST | `/api/v1/sandbox/payments/:id/expire` | **Simulateur** : expiration |
| GET | `/api/v1/methods` | Registre des méthodes disponibles |
| GET | `/api/v1/currencies` | Registre des devises |

**Exemple — créer un paiement :**
```bash
curl -X POST $BASE/api/v1/payments \
  -H "Authorization: Bearer sk_test_xxx" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: cmd-123" \
  -d '{"amount_minor":25000,"currency":"XOF",
       "methods":["orange_money","mtn_momo","wave","card"],
       "description":"Abonnement Premium",
       "redirect_url":"https://app.ma.com/succes"}'
# → { "id":"pay_…", "status":"pending", "checkout_url":"…/checkout/ck_…", … }
```

**Webhooks** : `POST {url}` avec header `X-CauriPay-Signature: t=<unix>,v1=<hmac-sha256(secret, t.body)>`. Retries 4 (1 s / 5 s / 30 s / 5 min), journal des tentatives, rejeu manuel, ping de test (`webhook.test`).

---

## 10. Checkout hébergée (sandbox)

1. Le dev crée un paiement → reçoit `checkout_url` (token `ck_*`).
2. Page publique : montant, devise, description, choix de la méthode (selon `methods`), saisie **téléphone**.
3. `POST /checkout/:token/initiate {phone}` → statut `processing`, écran **PIN** (simulation fidèle du flux mobile money).
4. `POST /checkout/:token/confirm {pin}` → en sandbox : **PIN ≠ 0000 → succès** après ~1,5 s ; **PIN 0000 → échec** (démontre le flux d'échec). Redirection vers `redirect_url` (ou page de statut).
5. Les webhooks `payment.processing` / `payment.succeeded|failed` partent en temps réel.

La page affiche clairement « **Mode TEST — aucun débit réel** ».

---

## 11. Sécurité

| Menace | Mitigation |
|---|---|
| Vol de secret | Clés `sk_` **hachées (sha256) au repos** — la valeur en clair n'est renvoyée qu'**une seule fois** (création de compte, rotation), comme Stripe ; `pk_` publiques non sensibles |
| Rejeu de requêtes | `Idempotency-Key` (UNIQUE) ; curseur pour les listes |
| Webhooks falsifiés | Signature HMAC-SHA256 (t+body), anti-replay par fenêtre de temps (±5 min), anti-SSRF sur les URL (IP privées interdites en production) |
| Mots de passe | **scrypt natif (node:crypto, salt 16 o, clé 64 o)** — zéro dépendance native, paramètres équivalents ou supérieurs à bcrypt(12) ; JWT 7 j |
| Injection SQL | Requêtes préparées (node:sqlite) partout |
| XSS dashboard | React + échappement ; CSP de base |
| Données carte | **Aucun PAN stocké** — la méthode `card` est simulée en v0.1 ; posture PCI-DSS par conception |
| Rate limiting | `@fastify/rate-limit` — **par clé API** sur /api/v1, global sur le reste |

---

## 12. Conformité & réglementaire (préliminaire — juriste requis)

- **v0.1 = sandbox uniquement** → aucune exigence d'agrément pour l'exploitation technique.
- **Production** : l'agrégation de paiement est régulée en UEMOA (BCEAO — statut EME) et CEMAC (COBAC). Stratégie en 2 temps : (1) brancher des **PSP/EME agréés en backend** (CinetPay, Orange Money API, MTN MoMo API, Flutterwave, Thunes pour l'international), (2) viser ses propres agréments une fois le volume là.
- **KYC/AML** des marchands requis avant le mode live (v0.2) ; enregistrement des transactions pour traçabilité.
- **PCI-DSS** : périmètre réduit tant qu'on ne stocke/traite pas de PAN (v0.1 : zéro donnée carte réelle).

---

## 13. Monétisation (proposition — à valider)

| Offre | Prix |
|---|---|
| Sandbox / test | Gratuit (illimité, simulateur) |
| Mobile money (UEMOA/CEMAC) | ~1,9 % + 75 FCFA par transaction réussie |
| Cartes locales | ~2,5 % + 150 FCFA |
| International (EUR/USD) | ~3,5 % |
| Abonnement Pro (équipes, SLA, analytics) | À définir |

Comparatif : Paystack 1,5 % + ₦100 local / 3,9 % intl ; CinetPay mobile money ~1,8-2,5 % selon pays. Notre axe : **transparence des frais** et **prix lissé sur la zone francophone** (un seul tarif, pas de surprise par pays).

---

## 14. UI/UX — Dashboard (v0.1)

**Design tokens** : vert émeraude `#0E9F6E` (marque), or `#F59E0B` (accent), sidebar sombre `#0B1220`, fond `#F6F7F9`, texte `#111827`. Police système.

**Navigation** (sidebar gauche) :
1. **Vue d'ensemble** — volume total (test), nb paiements, taux de succès, graphique 7 jours, derniers paiements.
2. **Paiements** — tableau (id, montant, devise, méthode, statut, date) + filtres + bouton « Nouveau paiement » (modal) + détail (timeline, événements, simulateur sandbox : approuver/échouer/expirer, lien checkout).
3. **Webhooks** — endpoints (url, événements, mode, actif), journal des tentatives (payload, signature, statut), rejouer, ping de test.
4. **Clés API** — affichage masqué + copie, rotation (test/live × pub/secret/webhook).
5. **Réglages** — profil marchand.

**Badge « Mode TEST »** permanent (aucun argent réel). Chaque paiement de test affiche `checkout_url` cliquable pour vivre le flux complet en 30 s.

---

## 15. Feuille de route (résumé — détail : `docs/ROADMAP.md`)

| Version | Contenu |
|---|---|
| **v0.1 (cette session)** | Sandbox complet : API paiements, simulateur, checkout, webhooks, dashboard, docs, tests, repo public |
| **v0.2** | Vrais PSP : connecteurs Orange Money API / MTN MoMo / CinetPay / Flutterwave / Thunes, mode live, KYC, monitoring |
| **v0.3** | SDK JS/TS + PHP, SDK mobile (React Native, Flutter), reversements (payouts) & ledger, plugins e-commerce |
| **v0.4** | Équipes & rôles, analytics, route d'agrément BCEAO/COBAC |

---

## 16. Décisions — statut de validation

| # | Décision | Statut |
|---|---|---|
| 1 | **Nom : CauriPay** (dépôt public `kitokoh/cauripay` créé) | ✅ Validé 2026-08-12 |
| 2 | **Stack : TypeScript** (Fastify 5 + React/Vite, node:sqlite) | ✅ Validé 2026-08-12 |
| 3 | **Périmètre v0.1 : sandbox complet** (pas d'argent réel) | ✅ Validé 2026-08-12 — v0.1 livrée |
| 4 | **Monétisation** : commission par transaction (§13) | ⏳ Proposition — arbitrée avant le mode live |
| 5 | **Licence du dépôt : MIT** | ✅ Validé 2026-08-12 |
| 6 | **Devises/méthodes v0.1** (8 devises × 6 méthodes) | ✅ Validé 2026-08-12 |
| 7 | **Hachage des mots de passe : scrypt natif** (et non bcrypt) | ✅ Validé 2026-08-14 — scrypt = zéro dépendance native (principe du projet), paramètres ≥ bcrypt(12) ; toute évolution doit passer par une issue |
| 8 | **Stockage des clés `sk_` : hachées (sha256)**, valeur en clair une seule fois (création/rotation) | ✅ Validé 2026-08-14 — aligne code et conception (modèle Stripe) |
| 9 | **Registres partagés** dans `packages/` (source de vérité unique devises/méthodes) | ✅ Validé 2026-08-14 |
| 10 | **Contributeurs multiples** : `main` protégé, PR + CI obligatoires, squash merge | ✅ Validé 2026-08-14 |

Remarque (ADR-1) : le DESIGN initial prévoyait bcrypt(12) ; l'implémentation utilise scrypt natif.
Décision : **conserver scrypt** (même famille KDF mémoire-dure, aucun ajout de dépendance native —
principe « zéro dépendance native » du §6) et aligner la conception sur le code, pas l'inverse.
Toute contrainte externe (ex. exigence client) sera traitée par issue dédiée.

## 17. Risques & mitigations

| Risque | Impact | Mitigation |
|---|---|---|
| Intégration réelle des opérateurs lente (KYC, contrats) | Retard v0.2 | Commencer les démarches tôt ; agréger via PSP existants d'abord |
| Réglementation (agrément requis pour encaisser) | Blocage légal | Rester en mode test / marque blanche jusqu'aux agréments ; conseil juridique |
| Concurrence (Paystack s'étend, CinetPay s'améliore) | Perte d'avance | Vitesse + DX + support francophone + mobile comme différenciateurs |
| Frais de change / liquidité cross-border | Marges | Partenaires de liquidité (Thunes, etc.) ; plafonds par devise |
| Sécurité (clés, webhooks) | Confiance | Design §11 ; audits avant mode live |
