# ADR-007 — Événement `transaction.completed` publié par ledger ET api-core

- **Statut** : Adopté · 2026-08-14
- **Issue** : GOURSI-ADR1 (#267)

## Contexte

Le ledger est la vérité comptable ; api-core possède le contexte métier (utilisateurs,
KYC, frais, notifications). Deux événements `financial.transaction.completed` risquent
d'être publiés (un par service), avec des contenus différents.

## Décision

- **ledger-service** publie `financial.transaction.completed` **dès que l'écriture est
  durable** (vérité comptable : montants, walletId, direction, type).
- **api-core** publie la version **enrichie** (contexte métier : userId, kycLevel, frais,
  notification payload) après réception.
- Les consommateurs **dédupliquent par `transactionId`** (clé d'idempotence côté consommateurs,
  ex. reconciliation).

## Conséquences

- La reconciliation peut s'appuyer sur l'événement ledger seul (aucune dépendance à api-core).
- Les notifications/audit consomment l'événement enrichi.
- Règle de conception : **jamais** deux publications du même service pour le même fait.
