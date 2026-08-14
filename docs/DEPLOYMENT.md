# DEPLOYMENT — Déploiement staging & production

## Convention de tags

- Semver : `vX.Y.Z` (ex. `v0.2.0`) — tag poussé sur `main` → déclenche `deploy-staging.yml`.
- Tag `latest` mis à jour sur chaque release staging.

## Pipeline staging (GOURSI-005c)

1. Push/tag sur `main` → workflow `deploy-staging.yml`
2. Build des images (`Dockerfile.nestjs` par service, `Dockerfile.java` pour ledger)
3. Push registry staging + `docker compose -f infra/compose/staging.yml up -d`
4. **Migrations AVANT démarrage** : `flyway migrate` (ledger) puis `prisma migrate deploy` (services TS)
5. Healthcheck global (tous les `/health` OK) sinon le déploiement est marqué FAILED

## Sécurité

- `INTERNAL_SERVICE_KEY` staging ≠ production (générée, injectée via secrets du registry/CI).
- Aucun secret dans les fichiers compose (variables d'environnement de l'orchestrateur).
- Images signées/épinglées par digest en production.

## Rollback

1. `docker compose -f infra/compose/staging.yml down`
2. Re-tagger l'image précédente (`latest` ← `vX.Y.Z-1`) et `up -d`
3. **Jamais de rollback de migration DB** : on corrige en avant (nouvelle migration V{n+1})
4. Vérifier l'audit comptable (`make audit`) après un rollback impliquant ledger
