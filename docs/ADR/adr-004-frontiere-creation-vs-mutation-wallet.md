# ADR-004 — Création du wallet (api-core) vs mutation de solde (ledger-service)

- **Statut** : Adoptée (2026-08-14)
- **Décideurs** : kitokoh (propriétaire), pilotage GOURSI

## Contexte

Ambiguïté de la spec : qui crée le wallet, et qui touche aux soldes ? La règle absolue n°1
dit que seul `ledger-service` écrit les soldes ; mais la création d'un compte (wallet à
solde 0) relève du cycle de vie utilisateur côté `api-core`.

## Décision

- **Création** : `api-core` crée le wallet (solde 0) dans sa propre base (entité `Wallet`
  Prisma), dans la même `$transaction` que `User` et `KycRecord` (GOURSI-021b).
- **Mutation de solde** : uniquement `ledger-service`, via l'API interne
  `/internal/ledger/*` (transfer, credit, debit, reverse). `api-core` ne fait **jamais**
  de mise à jour directe de balance — il passe par `LedgerClientService`.
- Le `ledger-service` ne connaît pas les wallets : il manipule des **comptes** (`accountId`
  = id de wallet) et des écritures immuables.

## Conséquences

- Un compte ledger peut exister indépendamment d'un wallet applicatif (ex. comptes
  techniques internes, frais, float opérateurs).
- La vérification d'intégrité COBAC (GOURSI-016c) compare les sommes d'écritures aux
  balances ledger — le périmètre est défini par le ledger seul.
- Toute tentative d'écriture directe de solde hors ledger est une régression bloquante en review.

_Fichiers concernés : `services/api-core` (entité Wallet), `services/ledger` (comptes/écritures)_
