# API-v2 — Référence de la plateforme GOURSI (api-core)

> Lecture rapide. **Source primaire : Swagger/OpenAPI** exposé par chaque service
> (`/api/v1/docs`). Contrat ledger interne : [docs/API-ledger.md](API-ledger.md).
> L'ancienne référence [docs/API.md](API.md) documente le legacy (v0.1).

## Conventions transverses

- Base publique : `https://api.goursi.com/api/v1` (dev : `http://localhost:3000/api/v1`).
- Auth : `Authorization: Bearer <JWT Keycloak RS256>` (issuer `…/realms/goursi`).
- Enveloppe succès : `{ success: true, data, timestamp, requestId }`.
- Enveloppe erreur : `{ success: false, error: { code, message, details? }, timestamp, requestId }`.
- Montants : **strings Decimal** (échelle 2) — jamais de float.
- Idempotence : header `Idempotency-Key` sur les écritures (UNIQUE).

## Codes d'erreur uniformes

| Code | HTTP | Usage |
|---|---|---|
| `BAD_REQUEST` | 400 | corps mal formé |
| `UNAUTHORIZED` / `MISSING_TOKEN` / `INVALID_TOKEN` | 401 | auth |
| `FORBIDDEN` | 403 | rôle insuffisant |
| `NOT_FOUND` | 404 | ressource inconnue |
| `CONFLICT` / `IDEMPOTENCY_CONFLICT` | 409 | transition invalide / clé rejouée |
| `VALIDATION_ERROR` | 422 | champs invalides |
| `INSUFFICIENT_FUNDS` | 422 | solde insuffisant (via ledger) |
| `LEDGER_UNAVAILABLE` | 503 | ledger-service injoignable |
| `INTERNAL_ERROR` | 500 | erreur interne (jamais de détail) |

## Auth (`/auth`)

| Méthode | Route | Corps | Succès |
|---|---|---|---|
| POST | `/auth/register` | `{ phone, fullName, mpin, role? }` | 201 — création User + Wallet (solde 0 via ledger) + KycRecord BASIC |
| POST | `/auth/login` | `{ phone, mpin }` | 200 — `{ accessToken, refreshToken }` (3 essais → verrouillage 30 min) |
| POST | `/auth/verify-otp` | `{ phone, otp }` | 200 — OTP SMS 6 chiffres (TTL 5 min, Redis) |
| POST | `/auth/refresh` | `{ refreshToken }` | 200 — rotation de tokens |
| POST | `/auth/change-mpin` | `{ currentMpin, newMpin }` | 200 |

## Wallets (`/wallets`)

| Méthode | Route | Rôle | Succès |
|---|---|---|---|
| GET | `/wallets/me/balance` | tout utilisateur | 200 — `{ walletId, balance, frozenBalance, version }` (via ledger, JAMAIS Prisma) |
| GET | `/wallets/me/history?page=&size=` | tout utilisateur | 200 — `LedgerEntryView[]` |
| GET | `/wallets/:id` | interne | 200 — solde d'un wallet |

## Transactions (`/transactions`)

| Méthode | Route | Corps | Succès |
|---|---|---|---|
| POST | `/transactions/transfer` | `{ recipientPhone, amount, description? }` + `Idempotency-Key` | 201 — orchestration : idempotence → KYC → frais → ledger (4 écritures) |
| POST | `/transactions/cash-in` | `{ amount, provider? }` | 201 — OTP envoyé |
| POST | `/transactions/cash-in/confirm` | `{ otp }` | 200 |
| POST | `/transactions/cash-out` | `{ amount, otp }` (agent) | 200 |
| POST | `/transactions/:id/reverse` | `{ reason? }` (SUPPORT_L2+) | 200 — écritures miroir REVERSAL |
| GET | `/transactions/:id/receipt` | — | 200 — reçu partageable |

## Exemple — transfert P2P

```bash
curl -X POST $BASE/transactions/transfer \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: cmd-001" \
  -d '{"recipient_phone":"+23566000001","amount":"2500.00","description":"Remboursement"}'
```

```json
{
  "success": true,
  "data": {
    "id": "txn_…",
    "type": "P2P",
    "status": "SUCCESS",
    "amountMinor": "2500.00",
    "feeAmountMinor": "25.00",
    "currency": "XAF"
  },
  "timestamp": "2026-08-14T12:00:00.000Z",
  "requestId": "req-…"
}
```

## Services & ports (ADR-004)

| Service | Port | Docs |
|---|---|---|
| api-core | 3000 | `/api/v1/docs` |
| web-admin / web-business | 3001 / 3002 | — |
| ledger-service | 3010 | interne (`/internal/ledger/*`), [API-ledger.md](API-ledger.md) |
| business-service | 3020 | `/api/v1/docs` |
| kyc-service | 3030 | `/api/v1/docs` |
| aml-service | 3040 | `/api/v1/docs` |
| notification-service | 3050 | `/api/v1/docs` |
| ussd-service | 3060 | — (USSD, pas de REST public) |
| reconciliation-service | 3070 | — |
| developer-gateway | 3080 | `/api/v1/docs` |
