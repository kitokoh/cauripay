# ADR-006 — Création de wallet vs mutation de solde

- **Statut** : Adopté · 2026-08-14
- **Issue** : GOURSI-ADR1 (#267)

## Contexte

La spec impose que les soldes ne soient jamais mutés hors du ledger-service. Reste à
trancher qui crée le wallet (l'enregistrement d'un compte) et à quel moment.

## Décision

Frontière claire :

- **`api-core` crée le wallet** (solde initial **0**) au moment de l'inscription utilisateur
  (opération `CREATE_WALLET` via le ledger, qui enregistre le wallet dans sa table de référentiel).
- **Seul `ledger-service` écrit les soldes** (credit/debit/transfer/reverse), sous contrôle
  d'idempotence et de concurrence (`@Version`).
- `api-core` **lit** les soldes et l'historique **exclusivement via le ledger**
  (`GET /internal/ledger/...`) — jamais par requête directe sur la table des soldes.

## Conséquences

- Invariant comptable unique, contrôlable (audit SQL : SUM(entries) = balance).
- Aucune double écriture concurrente possible entre services.
- Coût : un appel HTTP interne par lecture de solde (mitigé par cache court si besoin).
