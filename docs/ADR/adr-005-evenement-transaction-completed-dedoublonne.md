# ADR-005 — `transaction.completed` : publié par ledger ET api-core, dédupliqué par transactionId

- **Statut** : Adoptée (2026-08-14)
- **Décideurs** : kitokoh (propriétaire), pilotage GOURSI

## Contexte

Deux producteurs légitimes de l'événement « transaction terminée » : `ledger-service`
(vérité comptable, écritures passées) et `api-core` (vue enrichie : frais, utilisateurs,
métadonnées). Publier deux fois le même événement sur la même queue crée des doublons.

## Décision

Les deux services publient `transaction.completed` sur le même exchange, avec la même clé
de routage, et un identifiant commun `transactionId`. Les consommateurs **dédupliquent par
`transactionId`** (idempotence de consommation : la première occurrence gagne, les suivantes
sont ignorées et acquittées).

## Conséquences

- `ledger` publie dès que les 4 écritures sont passées (source de vérité comptable).
- `api-core` publie enrichi (frais, métadonnées métier) — les consommateurs métier
  (notification, business) peuvent préférer la version enrichie.
- Toute queue consommant `financial.events` doit être déclarée avec déduplication
  (voir GOURSI-RMQ1 pour la topologie RabbitMQ).

_Fichiers concernés : `services/ledger` (LedgerEventPublisher), `services/api-core`,
topologie RabbitMQ GOURSI-RMQ1_
