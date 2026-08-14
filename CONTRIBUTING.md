# Contribuer à CauriPay

Merci ! CauriPay est pensé pour que **plusieurs développeurs travaillent en parallèle** sans se marcher dessus. Ce guide pose les règles du jeu.

## 1. Lire avant de coder

- [docs/DESIGN.md](docs/DESIGN.md) — **source de vérité** : vision, architecture, sécurité, décisions validées.
- [docs/API.md](docs/API.md) — contrat de l'API (ne pas casser sans ADR).
- [docs/ROADMAP.md](docs/ROADMAP.md) — versions et épics.
- Les issues GitHub : chaque issue `parallel` est **indépendante** et prête à être prise.

## 2. Choisir une issue

1. Ouvrez le [backlog](https://github.com/kitokoh/cauripay/issues) (filtrer par milestone ou label `parallel`).
2. Les labels `prio:critical` / `prio:high` d'abord ; `good-first-issue` pour débuter.
3. **Assignez-vous l'issue** (ou commentez « je prends ») pour éviter les doublons.
4. Une issue = une PR, petite et ciblée. Si une issue est trop grosse, proposez de la découper.

## 3. Workflow git (obligatoire)

```
main (protégé — jamais de push direct)
 └─ feature/xxx-…  (votre branche)
     └─ Pull Request → CI verte → squash merge
```

```bash
git checkout -b fix/mon-sujet        # ou feat/, chore/, docs/
# … code + tests …
npm run check                         # lint + build + tests — DOIT être vert
git push -u origin fix/mon-sujet
# ouvrir la PR avec « Closes #<issue> » dans la description
```

Règles :
- **Branche depuis `main` à jour** (`git pull` juste avant de brancher).
- Noms de branche : `fix/`, `feat/`, `chore/`, `docs/`, `test/` + sujet court.
- **Squash merge** : la PR fusionne en un commit propre (historique linéaire).
- `main` est protégé : CI (lint, typecheck, tests, scan secrets) **exigée** avant merge.

## 4. Définition of Done (DoD)

Une PR n'est mergée que si :

- [ ] L'issue référencée (`Closes #n`) est réellement résolue.
- [ ] `npm run check` passe en local (lint, build, tests).
- [ ] Les nouveaux cas sont couverts par un test (`server/test/`).
- [ ] La doc impactée est à jour (API.md / DESIGN.md / README).
- [ ] Aucun secret, clé ou token dans le diff (gitleaks en CI le vérifie).

## 5. Conventions

- **TypeScript strict**, pas de `any` (sauf helpers DB documentés), imports relatifs `.js`.
- Montants toujours en **unités mineures entières** ; jamais de `float`.
- Nouveaux schémas SQL → migration dans `server/src/db.ts` (pattern `PRAGMA user_version`).
- Registres (devises, méthodes) → **`packages/registries`**, jamais dupliqués.
- Messages de commit en français, impératif : `fix(webhooks): reprendre les retries après redémarrage`.
- Nouvelles routes → documentées dans `docs/API.md` dans la même PR.

## 6. Travailler en parallèle

- Les issues labellisées `parallel` sont conçues pour être prises **simultanément** par plusieurs devs : elles touchent des fichiers disjoints.
- En cas de conflit de merge, `git pull --rebase origin main` puis résolvez.
- **Ne jamais merger soi-même sans CI verte** ; pour la revue : demandez un review, ou mergez si l'auteur est le mainteneur (règle du projet : CI verte + tests suffisent pour les petites PR).

## 7. Signaler un problème de sécurité

Voir [SECURITY.md](SECURITY.md) — ne **jamais** ouvrir d'issue publique pour un secret ou une vulnérabilité sensible.
