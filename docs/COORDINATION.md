# Coordination multi-agents — CauriPay / GOURSI

> **À LIRE AVANT DE CRÉER UNE PR.** Plusieurs développeurs (agents ou humains)
> travaillent simultanément sur ce dépôt. Ce document existe pour éviter les
> doublons, les conflits inutiles et les maintenances contradictoires.

## 1. Avant de commencer une issue

1. **Lisez `docs/REVUE-CONSTITUTION.md`** (structure cible) et **`docs/adr/`** (décisions
   acceptées). Une PR qui contredit la constitution sera fermée.
2. **Vérifiez les PR ouvertes** : si une PR ouverte couvre déjà votre issue,
   **commentez-y** au lieu d'en ouvrir une nouvelle. Si elle est fermée, lisez
   le commentaire de fermeture (supersession → la reprise se fait sur `main`).
3. **Vérifiez `main`** : beaucoup de travail est déjà fusionné. Rebasclez
   (`git fetch && git rebase origin/main`) avant de créer votre branche.
4. **Une PR = un bloc GOURSI** (ex. GOURSI-020a, ou un groupe cohérent
   GOURSI-011a-c). Les PR géantes « tout le bloc » sont fusionnées seulement
   si elles sont de qualité exceptionnelle et tests verts.

## 2. Conventions déjà en vigueur (ne pas casser)

| Règle | Détail |
|---|---|
| Protection `main` | PR obligatoire + checks `quality`/`test` verts + historique linéaire |
| CI | `ci.yml` (quality/test/test-java/legacy) + `security-scan.yml` (gitleaks/trivy/audit) + `deploy-staging.yml` |
| **⚠ `hashFiles`** | INTERDIT au niveau **job** (rejette tout le workflow) — uniquement au niveau **step** |
| Fichiers `.claude/planning/*` | **JAMAIS commités** — `.gitignore`d |
| Structure | `services/` (NestJS + `ledger-service` Maven), `apps/`, `packages/`, `infra/`, `legacy/` (v0.1 archivé) |
| Ports | ADR-004 (api-core 3000, ledger 3010, …) |
| Montants | Decimal (string) — jamais de float (packages/shared-types) |

## 3. Ordre de fusion recommandé (dépendances)

```
G0 (fait) → G1 ledger (PR #287) → G2 api-core (#181+) → G3 business → G4 fronts → G5 SDK → G6 QA
```

- **api-core (#181+)** dépend du ledger (LedgerClientService). Ne pas implémenter
  l'orchestration P2P avant que le contrat `/internal/ledger/*` soit stable.
- **kyc/aml/notification/ussd** : services dédiés (ADR-001), bootstrappables en
  parallèle dès que G2-020 (conventions api-core) est validé.

## 4. Si deux PR se chevauchent

- **La moins conforme à la constitution est fermée** avec un commentaire clair
  (cela est arrivé : #277/#279/#280/#283 fermées, #278 fusionnée).
- Rébasez AVANT de pousser (`git pull --rebase origin main`) ; le strict mode
  de la protection exige une base à jour.
- Signalez tout chevauchement en commentaire de PR — ne forcez pas un merge
  concurrent.

## 5. Qualité minimale d'une PR

- Tests (unitaires ET intégration quand pertinent — Testcontainers pour Java).
- `actionlint` propre sur les workflows modifiés (binaire : `actionlint`).
- ESLint + typecheck + tests TS verts (`make lint`, `make test-ts`).
- Pas de fichier de session (`.claude/`), pas de secret, pas de `.env` commité.
