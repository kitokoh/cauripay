# GOURSI-QA1 — Rapport de test de charge (modèle)

> Publier un rapport par exécution significative. Critères DoD #7 :
> **1000 tx/min soutenues · p95 < 2 s · erreur < 0,1 %**.

## Métadonnées

| Champ | Valeur |
|---|---|
| Date | YYYY-MM-DD |
| Environnement | staging / local-compose |
| Commit testé | `abc123` |
| k6 commande | `k6 run -e BASE_URL=… -e VUS=50 -e DURATION=2m tests/load/p2p-1000tpm.js` |
| Version k6 | vX.Y.Z |

## Résultats

| Métrique | Cible DoD | Résultat | ✔/✘ |
|---|---|---|---|
| Débit soutenu | 1000 tx/min | … tx/min | |
| p95 latence transfer | < 2 s | … ms | |
| Taux d'erreur | < 0,1 % | … % | |
| Échecs HTTP | < 0,1 % | … % | |

## Analyse

- Goulot principal : (ledger DB ? api-core ? RabbitMQ ? réseau ?)
- Observations : …
- Recommandations : …

## Artefacts

- Script : `tests/load/p2p-1000tpm.js`
- Sortie brute k6 : lien / fichier
