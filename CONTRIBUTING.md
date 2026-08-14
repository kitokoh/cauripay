# Contribuer à CauriPay

Merci d'aider CauriPay 🐚 — plateforme wallet dev-first pour l'Afrique centrale et de l'Ouest.

Ce guide définit **comment nous travaillons ensemble**, pour que plusieurs devs puissent
avancer en parallèle sans se marcher dessus. Le projet est organisé en **blocs** (G0→G6),
suivis via les **milestones GitHub** du même nom.

---

## 1. La règle d'or du board

> **Une issue ouverte = un travail planifié. Une issue fermée = un travail terminé (ou obsolète).**

- Tout travail commence par une **issue** (ou un commentaire sur une issue existante pour la revendiquer).
- Une issue en cours est **assignée** à son auteur.
- Une PR doit **référencer l'issue** (`Closes #123`) — elle ferme l'issue automatiquement à la fusion.

## 2. Structure du dépôt

```
cauripay/
├── packages/        # packages TypeScript partagés (shared-types, validation-rules, payment-rail-contracts)
├── services/        # services backend (ledger Java, api-core NestJS, kyc, aml, notification, ussd, business, reconciliation)
├── apps/            # fronts (web-admin, web-business, mobile-customer, mobile-agent)
├── infra/           # Docker, compose, Keycloak, RabbitMQ, Grafana
├── docs/            # DESIGN-v2, ADR/, TRACABILITY, DoD
└── archive/         # code historique non-cible (v0.1-aggregator)
```

Le cœur de la plateforme : **ledger-service** (cœur comptable, seul service autorisé à
écrire les soldes) et **api-core** (orchestration, auth, transactions).

## 3. Branches & commits

- **Branche depuis `main`** : `feat/<bloc>-<sujet>`, `fix/<sujet>`, `docs/<sujet>`, `chore/<sujet>`.
  Ex. : `feat/g1-ledger-write-service`, `docs/g0-adr-kyc-aml`.
- **Branches courtes** : une branche = une issue (ou un cluster d'issues d'un même bloc).
  Fusionnez vite pour limiter les conflits — `main` doit rester verte.
- **Convention de commits** (Conventional Commits) :
  `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`, `build:`, `ci:`.
  Ex. : `feat(ledger): implémente transferAtomic avec 4 écritures atomiques`.

## 4. Workflow d'une PR

1. `git checkout -b feat/...` depuis `main` à jour.
2. Implémentez + tests. **La CI doit passer** (lint TS + tsc + jest + `mvn verify` + scans gitleaks/trivy).
3. Poussez, ouvrez la PR avec le template (contexte, tests, preuves, checklist).
4. La PR est relue (au moins 1 avis) puis **squash-merge** dans `main`.
5. La fusion ferme l'issue ; vérifiez la checklist de done du bloc si vous clotûrez un épic.

> ⚠️ En parallèle, d'autres devs poussent sur `main`. Avant d'ouvrir une PR :
> `git fetch origin && git rebase origin/main` (ou merge) et re-testez.

## 5. Lignes rouges (régressions bloquantes en review)

Ces règles sont absolues — toute PR qui les viole est rejetée :

1. **Seul ledger-service écrit les soldes.** Aucune écriture de balance hors ledger
   (pas de UPDATE de solde dans api-core ou ailleurs). Voir ADR-004.
2. **Jamais de `double`/`float` pour les montants** — toujours des entiers en unités
   mineures (Java : `BigDecimal`/`long`, TS : `number` entier).
3. **Ledger : jamais de `@Transactional` sans isolation explicite** sur les écritures ;
   jamais de merge/delete sur `LedgerEntry` (écritures immuables, triggers en base).
4. **Aucun secret en clair** dans le code, les logs, les commits ou les fixtures :
   tout passe par l'environnement (`.env`, secrets GitHub, Keycloak). `gitleaks` tourne en CI.
5. **Idempotence** : toute opération mutante expose une clé d'idempotence et gère
   proprement le conflit UNIQUE concurrent (pas de 500 sur double POST).

## 6. Définition de done (rappel)

Chaque bloc a sa DoD dans son issue épic (`EPIC-G0` → `EPIC-G6`) et la liste consolidée
est dans `docs/DoD.md` (10 critères vérifiables, spec §8.5). Un épic ne se ferme que
DoD prouvée (tests, commandes, rapports).

## 7. Démarrage local

Prérequis : Node ≥ 22, JDK 21, Maven, Docker (pour les services d'infra et les tests
d'intégration Testcontainers).

```bash
make install      # dépendances (npm workspaces + mvn)
make up           # infra : Postgres, Redis, RabbitMQ, Keycloak, Prometheus, Grafana
make migrate      # migrations (ledger Flyway + Prisma)
make seed         # seed Keycloak + données de dev
make test         # tests TS + Java (unitaires)
make test-java    # tests Java (unitaires)
make test-java-it # tests Java y compris intégration (Testcontainers, nécessite Docker)
make lint         # lint + typecheck
```

## 8. Signaler un problème / demander une fonctionnalité

Utilisez les templates d'issues (`bug.yml`, `feature.yml`, `epic.yml`) : contexte,
critères d'acceptation, fichiers concernés, preuves attendues. Les issues GOURSI portent
des clés (`GOURSI-XXX`) — référez-les dans les PRs qui les implémentent.

## 9. Décisions d'architecture

Les décisions structurantes sont consignées en **ADR** dans `docs/ADR/`
(voir ADR-001 → ADR-005). Une ADR adoptée ne se change que par une nouvelle ADR.

---

Merci de respecter ce cadre — c'est ce qui permet à plusieurs devs de livrer en parallèle
sans faire dérailler le projet. 🚀
