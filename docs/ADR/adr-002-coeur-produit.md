# ADR-002 — Le cœur produit est la plateforme wallet GOURSI

- **Statut** : Adopté · 2026-08-14
- **Issue** : GOURSI-ADR1 (#267)

## Contexte

Le dépôt contient un agrégateur de paiement v0.1 (sandbox, Fastify + SQLite) pleinement
fonctionnel. La spec cible décrit une plateforme wallet complète (comptes, soldes, P2P,
cash-in/out, KYC/AML, USSD, agents, marchands).

## Décision

Le **cœur produit est la plateforme wallet**. L'agrégateur v0.1 **n'est pas la cible** :
il est conservé dans `apps/api-mvp` **en historique** (référence du produit sandbox,
toujours exécutable), mais toute l'énergie d'implémentation va aux services cibles (G0→G6).
Aucune nouvelle fonctionnalité ne doit être ajoutée à `apps/api-mvp` hors maintenance minimale.

## Conséquences

- Les chemins `server/` et `dashboard/` deviennent `apps/api-mvp/` et `apps/dashboard/`.
- Les nouveaux développements (G1+) n'étendent pas le monolithe v0.1.
- Le v0.1 reste disponible pour démo et comme fixture de référence produit.
