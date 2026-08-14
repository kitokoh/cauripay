# ADR-001 — kyc-service et aml-service sont des services dédiés

- **Statut** : Adopté · 2026-08-14
- **Issue** : GOURSI-ADR1 (#267)

## Contexte

La spec hésite entre des modules internes d'`api-core` (`src/modules/kyc`, `src/modules/aml`)
et des services autonomes. KYC et AML ont des cycles de vie, des charges et des exigences
réglementaires distincts (files de validation, listes OFAC/ONU/GABAC, gel de wallets).

## Décision

**kyc-service** et **aml-service** sont des **services dédiés** (microservices NestJS sous
`services/`), conformément au tableau d'architecture (§1.1). Ils communiquent avec `api-core`
par HTTP interne (`X-Service-Key`) et par événements RabbitMQ (`kyc.events`, `aml.events`).

## Conséquences

- `api-core` ne contient ni logique KYC ni logique AML, uniquement des clients HTTP/consumers.
- Chaque service a sa propre base, son propre scaling, ses propres tests.
- Coût : 2 déploiements et 2 jeux de données supplémentaires à opérer.
