# Contribuer à CauriPay

Merci de vouloir contribuer ! Ce document décrit le workflow que tout le monde
(équipe interne ou contributeurs) doit suivre pour que le dépôt reste
stable et que le travail parallèle ne se marche pas dessus.

## Philosophie du dépôt

- **`main` est sacré.** Tout passe par une *pull request* revue, avec une CI verte.
- **Une issue → une branche → une PR.** Ne regroupez pas plusieurs sujets dans une même PR.
- **Commits conventionnels** (voir ci-dessous) : l'historique est *linear history* (pas de merge commits, pas de force-push).
- **Issues pilotées** : travaillez sur une issue assignée ; criez une issue si un problème n'existe pas encore.

## Règles de branche

| Type de branche | Préfixe | Exemple |
|---|---|---|
| Issue GOURSI | `feat/GOURSI-XXX-...` | `feat/GOURSI-146-ci-lint-jest-mvn` |
| Bug | `fix/...` | `fix/checkout-syntax-error` |
| Doc | `docs/...` | `docs/readme-v2` |
| Chore / infra | `chore/...` | `chore/repo-governance` |
| Refactor / dette | `refactor/...` | `refactor/registry-types` |

Règles :
- Toujours partir de `main` à jour (`git pull` avant de brancher).
- Nom de branche court, en minuscules, mots séparés par `-`.
- Ne jamais pousser directement sur `main` (protégé).

## Conventional Commits

Format : `type(scope): description`

- `feat` — nouvelle fonctionnalité
- `fix` — correction de bug
- `docs` — documentation uniquement
- `chore` — maintenance, outillage, config
- `refactor` — changement sans changement de comportement
- `test` — ajout/modification de tests
- `ci` — pipeline / workflows
- `build` — build, dépendances

Exemples :
```
feat(GOURSI-146): add lint/tsc/jest/mvn CI jobs
fix(checkout): correct JS syntax error on line 171
docs(GOURSI-265): write README v2 and DESIGN v2
chore(GOURSI-001): restructure monorepo to apps/services/packages
```

Astuce : pour clore une issue automatiquement à la fusion, ajoutez
`Closes #<numéro>` ou `Fixes #<numéro>` dans le corps de la PR.

## Workflow PR (recommandé)

1. **Branchez** depuis `main` à jour.
2. **Implémentez** en commits atomiques (un commit = une étape logique).
3. **Poussez** et ouvrez une PR vers `main` (template fourni automatiquement).
4. **CI** : les checks doivent passer (lint, build TS, tests Jest, tests Java, gitleaks).
5. **Merge** : une seule personne approuve ; privilégiez *squash and merge* pour un historique propre.

## Workflow issues

- Avant d'ouvrir une issue, cherchez si elle n'existe pas déjà.
- Utilisez les templates : `bug`, `feature`, `epic`.
- Convention de labels : `prio:critical|high|medium|low`, `service:...`, `area:...`, `source:...`.
- Milestones : chaque issue appartient à un jalon (G0…G6 ou v0.x).

## Environnement local

Voir [docs/ONBOARDING.md](../docs/ONBOARDING.md) pour le setup complet (JDK 21, Node 22, Docker).
Raccourci : `make setup` installe, démarre l'infra, migre et seed — puis `make test`.

## Définition de done (DoD) — rappel

Toute issue est *done* quand :
- code implémenté et testé (tests unitaires/intégration pertinents),
- CI verte,
- documentation à jour si le comportement public change,
- PR mergée sur `main` et issue fermée.

## Questions ?

Ouvrez une discussion GitHub ou un commentaire sur l'issue concernée.
