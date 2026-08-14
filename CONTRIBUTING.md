# Contribuer à CauriPay

Merci de vouloir contribuer à CauriPay 🐚 — agrégateur de paiement dev-first pour
l'Afrique centrale et de l'Ouest.

Ce guide définit comment le dépôt reste sain **avec plusieurs développeurs qui
travaillent en parallèle**. Il est court : le lire prend 2 minutes.

---

## 1. Flux de travail (obligatoire)

1. **Partez toujours de la branche `main` à jour** :
   ```bash
   git checkout main && git pull
   ```
2. **Créez une branche dédiée**, une par issue :
   ```
   fix/42-ssrf-webhooks
   feat/58-provider-adapter
   docs/56-contrat-erreurs
   ```
   Convention : `<type>/<numéro-issue>-<slug-court>`.
3. **Une issue = une branche = une PR.** Si vous touchez à deux sujets,
   faites deux PR.
4. **Référencez l'issue** dans la PR : `Closes #42`.
5. **Passez le contrôle qualité local** (voir §3) avant de pousser.
6. **Ouvrez la PR** vers `main`. La CI (lint, typecheck, tests, build, audit,
   scan secrets) doit être verte avant toute revue.
7. **Squash-merge** une fois approuvé — l'historique de `main` reste linéaire.

> `main` est protégé : **aucun push direct**, aucune force-push. Tout passe par PR.

## 2. Règles de parallélisme (plusieurs devs en même temps)

- **Évitez de travailler sur les mêmes fichiers** en même temps. Le tableau de
  bord des issues (`parallel` / `blocked`) indique ce qui peut être pris en
  parallèle. Si deux PR modifient le même fichier, la seconde doit rebaser.
- **Pensez aux PR courtes** (< 300 lignes de diff). Facile à revoir, facile à
  rebaser, conflits minimisés.
- **Ne laissez pas traîner** : une branche ouverte plus de 2 jours doit être
  rebasée ou fermée. Une PR sans activité 7 jours est marquée comme telle.
- **Mise à jour** : avant de pousser, `git pull --rebase origin main` pour
  rester au plus près de `main`.

## 3. Contrôle qualité local (DoD)

```bash
npm install
npm run lint        # ESLint — 0 erreur
npm run typecheck   # tsc --noEmit server + dashboard
npm run test        # tests serveur (node:test)
npm run build       # build server + dashboard
npm run audit       # npm audit --audit-level=high (0 vulnérabilité high)
```

**Définition of Done** pour chaque PR :

- [ ] L'issue est référencée (`Closes #n`)
- [ ] Lint + typecheck + tests + build + audit passent
- [ ] Tests ajoutés ou mis à jour pour le comportement modifié
- [ ] Docs à jour si le comportement public (API, webhooks) change
- [ ] Aucun secret / clé / token dans le diff (gitleaks en CI le vérifie)

## 4. Style & architecture

- **TypeScript strict** partout. Pas de `any` (sauf cas documenté).
- Le serveur est **Fastify 5 ESM** : routes dans `server/src/routes/`,
  logique métier dans `server/src/*.ts` (pas de SQL dans les routes).
- Les **clés API ne sont jamais affichées en clair** (stockage haché/chiffré).
- Toute nouvelle dépendance doit se justifier dans la PR.
- La **source de vérité produit** est `docs/DESIGN.md` ; les décisions
  d'architecture sont consignées dans `docs/ADRs/`.

## 5. Signaler un problème

- **Bug** : ouvrez une issue avec le template Bug report (repro, attendu, réel).
- **Sécurité** : n'ouvrez **pas** d'issue publique — voir `SECURITY.md`.

## 6. Questions

Ouvrez une issue avec le label `question`, ou un commentaire sur l'issue
concernée. C'est public : pas de secrets (clés, tokens) dans les issues.
