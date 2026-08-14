# ADR-003 — Sort de l'ancien backlog (137 issues)

- **Statut** : Adopté · 2026-08-14
- **Issue** : GOURSI-ADR1 (#267), GOURSI-QA7 (#268)

## Contexte

Le dépôt porte 137 issues historiques (issues #1…#137) issues de la conception v0.1
(connecteurs PSP, SDK, KYC, multi-utilisateurs, etc.). La spec GOURSI couvre ces besoins
dans une architecture cible différente (microservices, ledger, services dédiés).

## Décision

L'**ancien backlog est fermé en masse** : les 137 issues sont **supersédées par la spec
GOURSI**. Toute exigence encore pertinente est tracée vers son équivalent GOURSI
(matrices : docs/TRACABILITY.md). Les issues historiques sont fermées avec un commentaire
de référence vers l'issue GOURSI correspondante.

## Conséquences

- Zéro ambiguïté : un seul backlog de travail (issues `GOURSI-*`, milestones G0…G6).
- Les issues fermées restent consultables (historique conservé).
- Toute exigence non tracée au moment de la fermeture est signalée dans TRACABILITY.md.
