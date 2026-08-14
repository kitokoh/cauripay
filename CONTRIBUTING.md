# Contribuer à CauriPay

Merci de vouloir contribuer ! Ce guide définit le workflow **obligatoire** pour que plusieurs devs
puissent travailler en parallèle sans se marcher dessus.

## 1. Règles d'or

1. **La spec fait foi** : `docs/REVUE-CONSTITUTION.md` est la constitution technique. Toute
   évolution passe par une ADR (`docs/ADR/`).
2. **Une issue = une branche = une PR**. Ne poussez jamais directement sur `main`.
3. **Conventional Commits** : `feat(GOURSI-XXX): ...`, `fix(...)`, `chore(...)`, `docs(...)`, `test(...)`.
4. **Jamais de secret** dans le code, les commits ou les messages. `.env*` est ignoré ; utilisez
   `.env.example`.
5. **Montants** : jamais de float — `BigDecimal` (Java) / `Decimal`/string (TS).

## 2. Workflow

```bash
# 1. Partir d'un main à jour
git checkout main && git pull --rebase

# 2. Branche dédiée
git checkout -b feat/GOURSI-XXX-description-courte

# 3. Commits atomiques (Conventional Commits)
git commit -m "feat(GOURSI-123): description"

# 4. Push + PR
git push -u origin feat/GOURSI-XXX-description-courte
# Ouvrir la PR avec le template fourni ; mentionner "Closes #XXX"

# 5. La PR doit passer tous les checks CI (lint, tsc, jest, mvn test)
# 6. Merge squash via l'interface GitHub (jamais de merge commit)
```

### Avant chaque push (surtout si d'autres devs travaillent en même temps)

```bash
git fetch origin && git rebase origin/main   # résoudre les conflits LOCALEMENT
# puis
git push --force-with-lease
```

## 3. Conventions de code

| Langage | Règles |
|---|---|
| TypeScript (services NestJS) | strict, kebab-case fichiers, PascalCase classes, Prettier + ESLint |
| Java (ledger-service) | packages DDD `com.goursi.ledger.{domain,application,infrastructure,api}`, Checkstyle + SpotBugs |
| SQL (Flyway) | `V{n}__description.sql` strictement croissant, jamais modifier une migration appliquée |
| Prisma | `id String @id @default(uuid()) @db.Uuid`, Decimal(15,2), jamais de Float |

### Liste rouge (non négociable, voir spec §8)

- Java : jamais double/float pour l'argent ; SERIALIZABLE sur les writes ; jamais merge/delete sur
  `LedgerEntry` ; IdempotencyKey obligatoire ; jamais d'exception avalée.
- TS : jamais `prisma.wallet.update({ balance })` — soldes via ledger uniquement ;
  `X-Idempotency-Key` obligatoire sur les écritures.

## 4. Environnement local

```bash
make install    # npm ci + deps
make up         # docker compose (postgres, redis, rabbitmq, keycloak, prometheus, grafana)
make migrate    # flyway + prisma
make seed       # seed Keycloak + data de test
make test       # jest (TS)
make test-java  # mvn test (ledger)
```

Voir `README.md` et `docs/DEPLOYMENT.md`.

## 5. Revue de code

- Chaque PR est relue ; l'auteur répond aux commentaires.
- Les PR de plus de ~400 lignes sont découpées (une issue = un changement cohérent).
- Les changements financiers (ledger, transactions, frais) exigent une revue attentive et des tests.
- Les tests sont obligatoires pour toute logique métier (acceptance criteria de l'issue).

## 6. Labels utiles

`good-first-issue`, `help wanted`, `prio:critical|high|medium`, `blocked`, `parallel`
(issue implémentable en parallèle d'autres), `area:*`, `service:*`, `app:*`.
