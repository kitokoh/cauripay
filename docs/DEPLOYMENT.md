# CauriPay — Déploiement (staging & prod)

## Principes

- **Staging reflète la prod** : même compose, mêmes migrations, mêmes images.
- Les **migrations s'exécutent avant** le démarrage des services (Flyway ledger, Prisma api-core).
- **Aucun secret en clair** dans les fichiers versionnés — tout passe par les variables d'environnement
  du runner (GitHub Secrets) ou le gestionnaire de secrets de la plateforme.
- Tags : `latest` sur `main`, `vX.Y.Z` sur les tags semver.

## Pipeline staging (automatique)

Un push sur `main` déclenche `.github/workflows/deploy-staging.yml` :

1. **Build & push** des images (api-core, ledger-service) vers GHCR, tag `latest`.
2. **Migrations** : `mvn flyway:migrate` (ledger) puis `prisma migrate deploy` (api-core) — avant tout démarrage.
3. **Déploiement** : `docker compose -f docker-compose.yml -f infra/compose/staging.yml up -d`.

### Déclencheurs
| Événement | Action |
|---|---|
| Push sur `main` | Déploie `latest` |
| Tag `vX.Y.Z` | Construit `vX.Y.Z` (artefact de release) |
| PR | Rien (CI seule) |

## Déployer manuellement

```bash
export TAG=v0.3.0
docker compose -f docker-compose.yml -f infra/compose/staging.yml build
docker compose -f docker-compose.yml -f infra/compose/staging.yml up -d
```

## Rollback

Procédure documentée (à exécuter par un admin) :

1. **Identifier la version précédente saine** : `TAG=v0.2.9` (ou commit précédent sur main).
2. **Re-tagger** : `docker tag ghcr.io/kitokoh/cauripay/api-core:v0.2.9 ghcr.io/kitokoh/cauripay/api-core:latest` (sur l'hôte).
3. **Redémarrer** : `docker compose -f infra/compose/staging.yml up -d --force-recreate`.
4. **Migrations** : ne jamais rollback de schéma sans procédure dédiée (Flyway `undo` désactivé par défaut) —
   en cas de migration cassée, restaurer un snapshot Postgres puis rejouer les migrations jusqu'à la version saine.
5. **Vérifier** : `/health` de chaque service, équilibre comptable (audit SQL GOURSI-QA2), dashboards Grafana.

> ⚠️ Règle : une migration une fois appliquée en staging n'est **jamais** modifiée —
> on crée une migration de correction. (Principe Flyway.)

## Environnements

| Env | URL | Note |
|---|---|---|
| Local (dev) | http://localhost:4000 | `make up` + `make dev` |
| Staging | à définir | déployé par CI |
| Prod | à définir | non déployé avant DoD v1 |
