# ADR-002 — Le cœur produit est la plateforme wallet ; l'agrégateur v0.1 n'est pas la cible

- **Statut** : Adoptée (2026-08-14)
- **Décideurs** : kitokoh (propriétaire), pilotage GOURSI

## Contexte

Le dépôt contient un MVP v0.1 fonctionnel (agrégateur Fastify + SQLite, sandbox de paiement
marchand). La constitution cible (REVUE-CONSTITUTION.md §5) décrit une **plateforme wallet**
multi-services (ledger comptable, api-core, KYC/AML, USSD, business, fronts).

## Décision

Le **cœur produit est la plateforme wallet** : portefeuilles utilisateurs, transactions P2P,
cash-in/cash-out, KYC/AML, notifications, USSD. L'agrégateur v0.1 est **conservé en historique**
dans `archive/v0.1-aggregator/` : il reste consultable et exécutable en référence, mais
n'est plus la cible d'aucune évolution. Aucun nouvel effort ne doit s'appuyer sur sa stack
(Fastify/SQLite).

## Conséquences

- Restructuration du monorepo : `services/`, `packages/`, `apps/`, `archive/`.
- Les issues de l'ancien backlog sont fermées (voir ADR-003).
- Le simulateur de providers marchands réapparaîtra plus tard via `business-service`
  et `payment-rail-contracts` (Bloc G3), pas via l'ancien `server/`.

_Fichiers concernés : `archive/v0.1-aggregator/`, `docs/DESIGN-v2.md` §1_
