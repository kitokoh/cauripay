# ADR-001 — kyc-service et aml-service sont des services dédiés

- **Statut** : Adoptée (2026-08-14)
- **Décideurs** : kitokoh (propriétaire), pilotage GOURSI
- **Contexte** : la spec contient une ambiguïté entre le tableau §1.1 (qui liste des services
  dédiés `kyc-service` et `aml-service`) et les chemins `src/modules/` visibles dans le catalogue
  des issues GOURSI-024/025 (qui suggèrent des modules dans api-core).

## Décision

`kyc-service` et `aml-service` sont des **services dédiés**, au même titre que
`ledger-service`, `notification-service` et `ussd-service`. Ils vivent dans `services/` du
monorepo, communiquent par HTTP interne (X-Service-Key) et par événements RabbitMQ.
Aucune logique KYC ou AML n'est embarquée dans `api-core`.

## Conséquences

- 6 services sur le bloc G2 : `api-core`, `kyc`, `aml`, `notification`, `ussd`, et le `ledger` (G1).
- `api-core` orchestre ; les services réglementaires restent isolés (confinement sécurité,
  déploiement et évolution indépendants).
- La règle absolue n°1 reste : **seul ledger-service écrit les soldes** — KYC/AML agissent
  sur les statuts (`kycLevel`, gel `FROZEN`), jamais sur les balances.

_Fichiers concernés : `services/kyc/`, `services/aml/`, `docs/DESIGN-v2.md` §4_
