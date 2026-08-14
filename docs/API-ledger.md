# API-ledger — Contrat HTTP interne api-core ↔ ledger-service

> **Source de vérité du contrat** (GOURSI-022c). Toute évolution non rétrocompatible
> doit casser la CI : les tests de contrat d'api-core (`ledger-contract.spec.ts`) et
> les tests MockMvc du ledger vérifient ce document.

## Conventions

- Base : `http://ledger-service:3010` (interne, réseau Docker `internal`).
- Header obligatoire : `X-Service-Key: <INTERNAL_SERVICE_KEY>` — comparé en temps constant (401 sinon).
- Montants : **strings Decimal** (échelle 2), jamais de float.
- Enveloppe succès : `{ success: true, data, timestamp, requestId }`.
- Enveloppe erreur : `{ success: false, error: { code, message, details? }, timestamp, requestId }`.
- Idempotence : `idempotencyKey` obligatoire sur les écritures ; rejeu → résultat en cache ;
  conflit de clé → **409**.

## Endpoints

| Méthode | Route | Corps (extraits) | Succès | Erreurs |
|---|---|---|---|---|
| POST | `/internal/ledger/transfer` | `{ idempotencyKey, transactionId, fromWalletId, toWalletId, amount, feeAmount?, platformFeesWalletId? }` | 201 `TransferResponse` | 401, 404 `WALLET_NOT_FOUND`, 409 `IDEMPOTENCY_CONFLICT`, 422 `INSUFFICIENT_FUNDS` / `VALIDATION_ERROR` |
| POST | `/internal/ledger/credit` | `{ idempotencyKey, transactionId, walletId, amount, entryType?, description? }` | 201 `LedgerEntryDto` | 401, 404, 409, 422 |
| POST | `/internal/ledger/debit` | `{ idempotencyKey, transactionId, walletId, amount, entryType?, description? }` | 201 `LedgerEntryDto` | 401, 404, 409, 422 `INSUFFICIENT_FUNDS` |
| POST | `/internal/ledger/reverse` | `{ originalTransactionId, idempotencyKey, reason? }` | 201 `TransferResponse` | 401, 409 `DUPLICATE_REVERSAL`, 404 |
| GET | `/internal/ledger/balance/{walletId}` | — | 200 `BalanceResponse` | 401, 404 |
| GET | `/internal/ledger/history/{walletId}?page=&size=` | — | 200 `LedgerEntryDto[]` | 401, 404 |
| GET | `/internal/ledger/transactions/{transactionId}/entries` | — | 200 `LedgerEntryDto[]` | 401, 404 |

## Codes d'erreur

| Code | HTTP | Signification | details |
|---|---|---|---|
| `UNAUTHORIZED` | 401 | X-Service-Key absente/invalide | — |
| `WALLET_NOT_FOUND` | 404 | wallet inconnu | `walletId` |
| `IDEMPOTENCY_CONFLICT` | 409 | clé d'idempotence déjà utilisée / en vol | `idempotencyKey` |
| `DUPLICATE_REVERSAL` | 409 | double annulation | `transactionId` |
| `OPTIMISTIC_LOCK` | 409 | conflit de concurrence (`@Version`) — retenter | — |
| `INSUFFICIENT_FUNDS` | 422 | solde disponible insuffisant | `walletId`, `available`, `required` |
| `VALIDATION_ERROR` | 422 | corps invalide (schéma, échelle, négatif…) | `details` |
| `INTERNAL_ERROR` | 500 | erreur inattendue (jamais de détail) | — |

## Règles

1. **4 écritures** pour `transfer` (débit principal, crédit principal, débit frais, crédit frais collectés) — tout ou rien (SERIALIZABLE).
2. Les écritures sont **immuables** (triggers PostgreSQL) — aucun UPDATE/DELETE possible.
3. Solde jamais négatif (trigger) ; concurrence par `@Version` + verrous pessimistes.
4. `requestId` propagé ; les erreurs 500 ne contiennent aucun détail interne.

## Tests de contrat

- api-core : `services/api-core/src/ledger-client/ledger-contract.spec.ts` — mock HTTP conforme à ce document
  (happy path + 401/409/422) ; un changement du contrat côté ledger ou client casse la CI.
- ledger-service : tests MockMvc/Testcontainers (`LedgerWriteServiceIT`, controller IT).
