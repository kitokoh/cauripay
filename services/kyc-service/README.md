# kyc-service — vérification d'identité GOURSI

> Service dédié (ADR-001, port **3030**) : dépôt de documents d'identité
> **chiffrés AES-256-GCM** au repos, file de validation `COMPLIANCE_OFFICER`,
> événements `kyc.events` (kyc.submitted / kyc.approved / kyc.rejected).

## Endpoints (préfixe `/api/v1`)

| Endpoint | Rôle | Accès |
|---|---|---|
| `POST /kyc/submit` | Dépôt dossier (documents chiffrés, statut PENDING) | Client authentifié |
| `GET /kyc/queue?status&level&documentType&from&page` | File de validation | `COMPLIANCE_OFFICER` |
| `POST /kyc/:id/approve` | Approbation → événement `kyc.approved` | `COMPLIANCE_OFFICER` |
| `POST /kyc/:id/reject` | Rejet motivé → `kyc.rejected` | `COMPLIANCE_OFFICER` |

Erreurs : `404 KYC_NOT_FOUND` · `409 KYC_ALREADY_PROCESSED` (double traitement) · `403 FORBIDDEN_ROLE` · `401` token.

## Sécurité

- Documents **jamais en clair** : `AES-256-GCM` (`iv:tag:cipher`), clé `KYC_ENCRYPTION_KEY` (64 hex, obligatoire, fail-fast).
- Aucun document dans les logs ; les projections API n'exposent que des métadonnées.
- Auth JWT (production : RS256 Keycloak via `JWKS_URL` ; dev/test : HS256 `JWT_SECRET`).

## Run

```bash
createdb kyc   # Postgres
cd services/kyc-service
npx prisma migrate dev --name init   # schéma
KYC_SERVICE_PORT=3030 DATABASE_URL=postgresql://goursi:goursi@localhost:5432/kyc \
RABBITMQ_URL=amqp://guest:guest@localhost:5672 INTERNAL_SERVICE_KEY=dev-internal-key-0123456789 \
KYC_ENCRYPTION_KEY=$(openssl rand -hex 32) JWT_SECRET=dev-jwt-secret-0123456789 \
npm run start:dev
```

## Tests

```bash
npm test                  # unitaires (Prisma mocké) — exécutés en CI
npm run test:e2e          # E2E local : nécessite Postgres (DATABASE_URL) + migrations
```
