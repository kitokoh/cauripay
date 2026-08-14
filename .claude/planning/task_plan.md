# CauriPay — Plan de pilotage technique (lead)

## Mission
Agir comme responsable technique du dépôt kitokoh/cauripay : implémenter les issues ouvertes
une à une (de la fondation vers le dernier #271), merger chaque PR, créer des issues pour les
autres devs si nécessaire, tenir à jour vision/conception (ADR, DESIGN, README, spec), et
rendre le dépôt apte au travail parallèle multi-devs (CI, conventions, branch protection,
templates, CODEOWNERS, bootstrap).

## Backlog (271 issues ouvertes, 0 fermée)
- #1-#137 : roadmap produit v0.1→v0.4 (connecteurs PSP, SDK, payouts, agréments) — épics
- #138-#153 : **G0 Fondation & Infrastructure** (monorepo, docker, CI, sécurité, Keycloak, RabbitMQ, obs)
- #154-#180 : **G1 ledger-service Java** (cœur comptable — chemin critique, tout en dépend)
- #181-#217 : **G2 api-core NestJS + kyc/aml/notification/ussd**
- #218-#232 : **G3 business-service & reconciliation**
- #233-#254 : **G4 Fronts & Mobile** (Flutter ×2, Next.js ×2)
- #255-#260 : **G5 Developer Platform** (dev-gateway, SDK JS/Flutter)
- #261-#271 : **G6 QA, Sécurité & DoD**

## Ordre d'exécution (dépendances)
1. **Phase 1 — G0** (#138→#152) puis EPIC-G0 (#153) : socle multi-dev.
2. **Phase 2 — G1** (#154→#179) puis EPIC-G1 (#180) : ledger Java complet, tests verts.
3. **Phase 3 — G2 api-core** (#181→#202) : bootstrap → auth → transactions → tests E2E.
4. **Phase 4 — G2 réglementaire** (#203→#217) : kyc, aml, notification, ussd.
5. **Phase 5 — G3** (#218→#230) puis EPIC-G3 (#232) : business-service, reconciliation.
6. **Phase 6 — Docs & QA** (#261→#271) : DoD, ADR, README/DESIGN v2, audit — en continu.
7. **Phase 7 — Gouvernance multi-dev** : branch protection, CONTRIBUTING, templates, CODEOWNERS, milestones.
8. **Phase 8 — G4/G5** selon budget de session : scaffolds des fronts + dev-gateway.

## Règles d'ingénierie (issues = spec)
- Conventional Commits `feat(GOURSI-XXX): ...` ; branches `feat/GOURSI-XXX-slug`.
- Chaque issue → sa branche → PR → CI verte → squash merge → issue fermée (Fixes #n).
- Ledger : BigDecimal only, SERIALIZABLE, @Immutable, jamais merge/delete, Flyway seul maître du DDL.
- api-core : ledger-client obligatoire pour les soldes (JAMAIS Prisma pour les balances).
- Les épics se ferment quand toutes leurs issues enfants sont fermées.
