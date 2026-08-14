# ADR-001 — kyc-service et aml-service sont des services dédiés

> Extrait du registre `docs/ADR/README.md` — fichier canonique : `docs/ADR/README.md`.

- **Statut** : Adoptée · **Date** : 2026-08-14 · **Décideur** : kitokoh
- **Contexte** : le catalogue initial logeait KYC/AML dans api-core ; §1.1 les définit autonomes.
- **Décision** : services NestJS dédiés (ports 3030/3040), le tableau §1.1 prime.
- **Conséquences** : déploiement séparé, périmètre de sécurité propre, consommation d'événements.
