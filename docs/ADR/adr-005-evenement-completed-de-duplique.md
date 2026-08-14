# ADR-005 — Événement transaction.completed : ledger ET api-core, déduplication par transactionId

- **Statut** : Adoptée · **Date** : 2026-08-14 · **Décideur** : kitokoh
- **Contexte** : ledger (vérité comptable) et api-core (enrichi) publient tous deux
  transaction.completed.
- **Décision** : mêmes transactionId ; consommateurs dédupliquent par transactionId.
- **Conséquences** : idempotence de consommation obligatoire chez les consommateurs.
