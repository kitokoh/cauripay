# CauriPay — Feuille de route

> Stratégie produit en 4 versions. Le MVP v0.1 (sandbox) est conçu pour être livré et testable en une session.

## v0.1 — Sandbox complet (cette session, après validation de la conception)
**Objectif** : prouver la DX (10 lignes de code → paiement réussi), tester le produit sans argent.
- [ ] API paiements v1 (création, liste, détail, annulation, idempotence)
- [ ] Clés API test/live + rotation
- [ ] Simulateur sandbox (approve/fail/expire) fidèle aux flux réels
- [ ] Checkout hébergée (mobile money : téléphone → PIN → succès/échec)
- [ ] Webhooks signés HMAC + retries + journal + rejeu
- [ ] Dashboard React (overview, paiements, webhooks, clés, réglages)
- [ ] Docs (README, API.md, DESIGN.md) + tests E2E
- [ ] Dépôt GitHub public + CI

**Critère de succès** : un développeur inconnu peut, en lisant le README, créer un paiement et recevoir un webhook en < 10 minutes.

## v0.2 — Premier argent réel (mois 2-4)
- Connecteurs PSP : **Orange Money API**, **MTN MoMo API** (collecte), **CinetPay**, **Flutterwave**, **Thunes** (international) — via une interface provider unique (les adaptateurs simulés de v0.1 deviennent réels).
- Mode live : activation par marchand après KYC/AML minimal (document, preuve d'activité).
- Monitoring : alertes webhook, tableaux de bord latence/échecs par provider, statut des opérateurs.
- Comptes multi-utilisateurs (owner + devs) avec rôles.
- Sécurité : audit, rate limiting renforcé, journal d'audit.

## v0.3 — Mobile, SDK & paiements sortants (mois 5-8)
- **SDK JS/TS** officiel (Node + navigateur) puis **PHP** (Laravel) — le README v0.1 en préfigure l'usage.
- **SDK mobile** : React Native + Flutter (checkout in-app, deep links).
- **Reversements (payouts)** : virement vers mobile money / banque, ledger comptable, rapprochement (reconciliation).
- Plugins e-commerce : WooCommerce, PrestaShop, Shopify.
- Abonnement Pro (équipes, SLA, analytics avancés).

## v0.4 — Consolidation réglementaire & scale (mois 9+)
- Dossier d'agrément **EME (BCEAO)** et **COBAC** — ou partenariat marque blanche formalisé.
- Paiements transfrontaliers inter-opérateurs (hub UEMOA→CEMAC→international).
- Produits financiers : comptes marchands, épargne, crédit sur flux.

## Jalons critiques & dépendances
| Jalon | Dépend de | Risque |
|---|---|---|
| Vrais connecteurs opérateurs | Contrats + KYC fournisseurs | Moyen (délais) — mitigation : commencer tôt, agréger via PSP d'abord |
| Mode live | KYC marchand + posture légale | Moyen — conseil juridique dès v0.2 |
| SDK mobile | API stable v1 | Faible |
| Agrément EME | Volume + fonds propres | Élevé (temps) — la marque blanche couvre la période |
