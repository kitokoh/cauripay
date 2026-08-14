# CauriPay — Feuille de route

> Stratégie produit en 4 versions. **Le backlog GitHub est la source opérationnelle** :
> chaque ligne ci-dessous renvoie aux épics/issues ; les labels `prio:*` et `parallel` pilotent l'exécution.

## ✅ v0.1 — Sandbox complet (livré 2026-08-12)
**Objectif** : prouver la DX (10 lignes de code → paiement réussi), tester le produit sans argent.
- [x] API paiements v1 (création, liste, détail, annulation, idempotence)
- [x] Clés API test/live + rotation (clés `sk_` hachées au repos)
- [x] Simulateur sandbox (approve/fail/expire) fidèle aux flux réels
- [x] Checkout hébergée (mobile money : téléphone → PIN → succès/échec)
- [x] Webhooks signés HMAC + retries + journal + rejeu
- [x] Dashboard React (overview, paiements, webhooks, clés, réglages)
- [x] Docs (README, API.md, DESIGN.md) + tests E2E
- [x] Dépôt GitHub public + CI (lint, typecheck, tests, scan secrets)

**Critère de succès** : un développeur inconnu peut, en lisant le README, créer un paiement et recevoir un webhook en < 10 minutes.

## 🚧 v0.2 — Premier argent réel (en cours — épic → issues GitHub)
- [ ] **Interface Provider** (contrat `ProviderAdapter` + registre + résolution par mode) — fondation des connecteurs : #57 #58 #59
- [ ] Connecteurs PSP : **Orange Money API** (#75-#81), **MTN MoMo API** (#82-#88), **Wave** (#89-#95), **CinetPay** (#96-#102), **Flutterwave** (#103-#109), **Thunes** (#110-#116)
- [ ] Mode live : activation par marchand après KYC/AML (#60, #61-#64) + garde-fous (#136)
- [ ] Monitoring : alertes webhook/SLA (#72), statut/latence/échecs par provider (#71)
- [ ] Multi-utilisateurs owner/dev/lecture (#67-#69), journal d'audit (#70)
- [ ] PostgreSQL derrière la couche d'accès unique (#65 #66)
- [ ] Déploiement : Docker + compose + TLS + CI de release (#73 — Docker déjà en place)

## v0.3 — Mobile, SDK & paiements sortants
- [ ] **SDK JS/TS** officiel (`@cauripay/sdk`, Node + navigateur) : #117 #118 #119 #120
- [ ] SDK PHP (Laravel) : #121
- [ ] SDK mobile : React Native #122, Flutter #123
- [ ] **Reversements (payouts)** : #124 #125 #126 #137 ; ledger + rapprochement : #127
- [ ] Plugins e-commerce : WooCommerce, PrestaShop, Shopify : #128
- [ ] Abonnement Pro (équipes, SLA, analytics) : #129
- [ ] Widget de checkout personnalisable : #74

## v0.4 — Consolidation réglementaire & scale
- [ ] Dossier d'agrément **EME (BCEAO)** #131 et **COBAC** #132
- [ ] Paiements transfrontaliers inter-opérateurs (hub UEMOA→CEMAC→international) : #133
- [ ] Produits financiers : comptes marchands, épargne, crédit sur flux : #135
- [ ] Infrastructure multi-région & scalabilité : #134

## Jalons critiques & dépendances
| Jalon | Dépend de | Risque |
|---|---|---|
| Vrais connecteurs opérateurs | Interface Provider (fait) + contrats/KYC fournisseurs | Moyen (délais) — mitigation : commencer tôt, agréger via PSP d'abord |
| Mode live | KYC marchand + posture légale | Moyen — conseil juridique dès v0.2 |
| SDK mobile | API stable v1 | Faible |
| Agrément EME | Volume + fonds propres | Élevé (temps) — la marque blanche couvre la période |

## Note — backlog « goursi »
Les issues #138-#271 (`source:goursi`) appartiennent à un **autre projet** (plateforme wallet Goursi :
ledger Java, api-core NestJS, Keycloak, apps Flutter). Elles ne font pas partie du périmètre CauriPay
et doivent migrer vers un dépôt dédié (voir discussion sur le repo).
