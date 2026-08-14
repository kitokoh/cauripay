# ADR-003 — Sortie de l'ancien backlog (137 issues) : fermeture en masse

- **Statut** : Adoptée (2026-08-14)
- **Décideurs** : kitokoh (propriétaire), pilotage GOURSI

## Contexte

L'ancien backlog (issues #1–#137) couvre l'agrégateur v0.1 : connecteurs PSP, SDK, epics
produit. Après la revue de constitution, la feuille de route cible est le backlog GOURSI
(#138–#271), organisé en blocs G0→G6 avec définition de done par bloc.

## Décision

L'ancien backlog est **fermé en masse** : chaque issue reçoit un commentaire de fermeture
standard pointant vers l'ADR-002 et vers l'issue GOURSI qui la remplace le cas échéant.
Fermer = `state: closed` (l'historique reste consultable, aucune donnée n'est perdue).
La règle d'or du board : **une issue ouverte = un travail planifié dans le backlog courant**.

## Conséquences

- Board lisible pour les devs concurrents : seuls les blocs G0→G6 sont ouverts.
- Les besoins réels de l'ancien backlog non couverts par GOURSI peuvent être rouverts
  sous forme de nouvelle issue rattachée au bloc concerné.
- Référence croisée : si un besoin de l'ancien backlog est déjà tracé dans GOURSI,
  la fermeture référence l'issue GOURSI.

_Fichiers concernés : board GitHub, `docs/TRACABILITY.md`_
