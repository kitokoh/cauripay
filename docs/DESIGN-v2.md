# GOURSI — Dossier de conception v2 (plateforme wallet)

> **Statut : validé (Phase 0 — conception).** Ce document remplace `docs/DESIGN.md` (v0.1, agrégateur) comme source de vérité de l'architecture.
> Date : 2026-08-14 · Auteur : responsable projet (kitokoh) · Référence : backlog GOURSI (#138–#271)

---

## 1. Synthèse exécutive

**GOURSI** (nom de code du cœur produit CauriPay) est une **plateforme wallet** complète : comptes clients, agents, marchands,
ledger comptable double écriture, conformité (KYC/AML), paiement de factures, mobile money et agrégation de rails de paiement.

L'ancien dépôt contenait un **agrégateur v0.1 sandbox** (Fastify + React + SQLite). Cette v1 du dépôt **n'est pas la cible** :
elle est conservée en historique (`legacy/`) et l'architecture cible est le **monorepo GOURSI** décrit ci-dessous
(voir ADR-002).

Le backlog GOURSI est découpé en **7 blocs pilotés** par des issues ÉPIC :

| Bloc | Contenu | Issues | Milestone |
|---|---|---|---|
| **G0** | Fondation & infrastructure (monorepo, compose, CI/CD, Keycloak, RabbitMQ, packages) | #138–#153 | G0 |
| **G1** | ledger-service Java/Spring (cœur comptable) | #154–#180 | G1 |
| **G2** | api-core NestJS + kyc/aml/notification/ussd | #181–#231 | G2 |
| **G3** | business-service & reconciliation | #218–#232 | G3 |
| **G4** | Fronts & mobile (web-admin, web-business, mobile-customer, mobile-agent) | #233–#254 | G4 |
| **G5** | Developer Platform (developer-gateway, SDK JS/Flutter) | #255–#260 | G5 |
| **G6** | QA, sécurité & DoD | #261–#271 | G6 |

## 2. Architecture cible

```
                       ┌────────────────────────────────────────────┐
                       │               Clients                       │
                       │  mobile-customer · mobile-agent · web-admin │
                       │  web-business · USSD *100# · SDK devs       │
                       └──────────────┬─────────────────────────────┘
                                      │ HTTPS
                ┌─────────────────────▼─────────────────────────────┐
                │            developer-gateway (:3080)               │  API clés, sandbox, webhooks dev
                └─────────────────────┬─────────────────────────────┘
        ┌─────────────────────────────┼─────────────────────────────┐
        │                             │                             │
   ┌────▼─────┐                  ┌────▼─────┐                  ┌────▼─────┐
   │ api-core │◄────────────────►│ business │◄────────────────►│   ussd   │
   │  (:3000) │   auth, tx,      │ (:3020)  │   rails, bulk,   │ (:3060)  │
   └────┬─────┘   wallets        └────┬─────┘   marchands      └──────────┘
        │        ┌───────────────────┼──────────────────┐
   ┌────▼─────┐  │  ┌────▼─────┐ ┌───▼─────┐ ┌────▼─────┐ │
   │ ledger   │◄─┼─►│   kyc    │ │   aml   │ │ notif.   │ │
   │ (:3010)  │    │  (:3030)  │ │ (:3040) │ │ (:3050)  │ │
   └────┬─────┘    └──────────┘ └─────────┘ └──────────┘ │
        │                                                │
   ┌────▼─────┐                                     ┌────▼─────┐
   │reconcile │                                     │ RabbitMQ │── events
   │ (:3070)  │                                     │ Redis    │── cache/idem
   └──────────┘                                     └──────────┘
```

**Services & ports (convention unique, cf. ADR-004) :**

| Service | Port | Stack | Rôle |
|---|---|---|---|
| api-core | 3000 | NestJS + Prisma | Auth, transactions, wallets (orchestrateur) |
| ledger-service | 3010 | Spring Boot 3.2 / Java 21 | Grand livre comptable (vérité financière) |
| business-service | 3020 | NestJS | Paiements marchands, rails, bulk, webhooks |
| kyc-service | 3030 | NestJS | Vérification d'identité (documents chiffrés) |
| aml-service | 3040 | NestJS | Scoring risque, listes OFAC/ONU/GABAC, gel |
| notification-service | 3050 | NestJS | Canaux SMS/Email/Push/WhatsApp, retries, DLQ |
| ussd-service | 3060 | NestJS | Menu USSD *100# (sessions Redis) |
| reconciliation-service | 3070 | NestJS | Rapports COBAC quotidiens, CSV/PDF |
| developer-gateway | 3080 | NestJS | API publique devs (clés, sandbox, webhooks) |
| web-admin | 3001 | Next.js | Back-office (tous rôles) |
| web-business | 3002 | Next.js | Portail entreprises (2FA obligatoire) |
| mobile-customer | — | Flutter 3.22 | App client (P2P, factures, wallet) |
| mobile-agent | — | Flutter 3.22 | App agent (cash-in/out, float) |

**Briques transverses :** PostgreSQL 16, Redis 7, RabbitMQ 3, Keycloak (realm `goursi`, RS256), Prometheus, Grafana.

## 3. Principes non négociables (règles de conception)

1. **Montants = BigDecimal/Decimal ou string — jamais de float** (`double`/`number` interdit pour l'argent).
2. **Le ledger est la seule source de vérité des soldes.** Aucun service (api-core compris) ne doit
   écrire de solde en base : `JAMAIS prisma.wallet.update({ balance })`.
3. **Écritures ledger en `SERIALIZABLE`, tout ou rien.** `transferAtomic` = exactement 4 écritures
   (débit principal, crédit principal, débit frais, crédit frais collectés).
4. **Immutabilité des écritures comptables** : entité JPA `@Immutable` + triggers PostgreSQL (V5) qui
   refusent `UPDATE`/`DELETE` sur `ledger_entries` (« Opération interdite »).
5. **Concurrence par verrou optimiste** `@Version` sur `ledger_balances`.
6. **Idempotence partout** : `X-Idempotency-Key` obligatoire sur les écritures (Redis TTL 24 h ledger,
   API via clé d'idempotence par transaction).
7. **Événements publiés APRÈS commit** (jamais d'événement d'une transaction annulée).
8. **Inter-services** : header `X-Service-Key`, comparé en temps constant, jamais loggé.
9. **Auth unique Keycloak RS256** : tous les services valident les JWT avec les rôles de la spec
   (CUSTOMER, MERCHANT, AGENT, DISTRIBUTOR, SUPER_ADMIN, COMPLIANCE_OFFICER, SUPPORT_L1, SUPPORT_L2,
   FINANCE_MANAGER, OPS_AGENT_MANAGER).
10. **Injection par constructeur, DDD** côté Java ; **enveloppes uniformes** côté TS :
    `{ success, data, timestamp, requestId }` / `{ code, message, details }`.

## 4. Modèle de données

### 4.1 Schéma ledger (Flyway, `services/ledger-service`)

- **V1** `CREATE SCHEMA ledger` + extension `uuid-ossp`
- **V2** `ledger_entries` : id UUID PK, transaction_id, wallet_id, direction CHECK IN ('DEBIT','CREDIT'),
  amount NUMERIC(15,2) CHECK > 0, balance_before, balance_after, entry_type, description, created_at —
  **pas d'`updated_at`** (immuable) ; index `idx_le_transaction`, `idx_le_wallet_date`
- **V3** `ledger_balances` : wallet_id UUID PK, balance NUMERIC(15,2) DEFAULT 0 CHECK >= 0,
  frozen_balance DEFAULT 0 CHECK >= 0, **version BIGINT** (@Version), last_updated_at
- **V4** `ledger_checkpoints` : snapshot nightly (cron 2 h, Spring Batch)
- **V5** triggers immutabilité (refus UPDATE/DELETE sur entries) + solde non négatif
- **V6** vues d'audit (SUM(CREDIT)-SUM(DEBIT) par jour)

### 4.2 Schéma api-core (Prisma)

`User` (rôle, kycLevel, statut, lockout), `Wallet` (type CUSTOMER/AGENT/MERCHANT/PLATFORM_FEES,
statut ACTIVE/FROZEN, accountNumber unique), `KycRecord` (niveau demandé, documents, statut),
`Transaction` (machine à états, idempotencyKey unique, metadata.ledgerEntryIds, failureReason),
`AuditLog` (insert-only), `WebhookEndpoint`, `WebhookDelivery`, `Otp`, `ApiKey`, `BulkPayment`, `MerchantPayment`, `ReconciliationReport`.

## 5. Règles métier

### 5.1 Frais (`packages/validation-rules`, testés une seule fois)

| Type | Taux (exemple) | Acceptance |
|---|---|---|
| P2P | 1 % | `calculateFee('P2P', 10000).feeAmount === 100` |
| CASH_IN / CASH_OUT / BILL_PAYMENT / MERCHANT_PAYMENT | table dédiée | — |

### 5.2 Limites KYC (quotidiennes/mensuelles, contrôlées avant tout appel ledger)

- `checkKycLimit('BASIC', 60000, 0, 0, 0).allowed === false` → plafond BASIC < 60 000
- Niveaux : BASIC, VERIFIED, PREMIUM. Dépassement → **422 `KycLimitExceededException`**.
- Les totaux sont des limites de **conformité**, jamais une source de vérité de solde.

### 5.3 Machine à états `Transaction`

`PENDING → PROCESSING → SUCCESS | FAILED` ; `PENDING → CANCELLED` ; toute transition invalide → **409**.
Expiration PENDING : +30 min. Reversal (`reverse`, SUPPORT_L2+) → écritures miroir + statut REVERSED.

### 5.4 P2P (ordre exact, spec §4.3)

1. `X-Idempotency-Key` (requis) → retourne la transaction existante si déjà traitée
2. Wallet source ACTIVE + kycLevel → 3. `checkKycLimit` → 4. `calculateFee('P2P')`
5. Wallet destination par accountNumber → 6. create PENDING (expiresAt +30 min)
7. `ledger.transferAtomic { idempotencyKey, transactionId, fromWalletId, toWalletId, amount, feeAmount, platformFeesWalletId }`
   — échec → FAILED + failureReason
8. SUCCESS + processedAt + `metadata.ledgerEntryIds`
9. Événement `financial.events:transaction.completed` + mise à jour des totaux quotidiens/mensuels

### 5.5 Cash-in / cash-out (agents)

OTP 6 chiffres (Redis TTL 5 min), reçu, gestion 422 (solde insuffisant) et OTP invalide.
Cash-out : montant + OTP client → confirmation.

## 6. Événements (RabbitMQ, topologie déclarée idempotente — GOURSI-RMQ1)

| Exchange | Routing keys | Consommateurs |
|---|---|---|
| `financial.events` | `transaction.completed`, `transaction.failed`, `transaction.reversed`, `agent.float.low` | api-core, notification, business |
| `notification.events` (fanout) | — | notification-service → canaux |
| `kyc.events` | `kyc.approved`, `kyc.rejected` | api-core (upgrade kycLevel) |
| `aml.events` | `alert.created` | api-core (gel wallet FROZEN) |

Payload minimal : `{ transactionId, type, amount, status, walletIds }`.

## 7. Sécurité

| Menace | Mitigation |
|---|---|
| Appels inter-services non autorisés | `X-Service-Key` temps constant + 401 `INVALID_SERVICE_KEY` ; ledger jamais exposé publiquement |
| Auth faible | Keycloak RS256, lockout 3 essais (Redis 30 min), OTP SMS 6 chiffres (5 min), MPIN |
| Falsification webhooks | HMAC-SHA256 `t.payload`, anti-replay ±5 min, retries backoff + DLQ |
| Vol de documents KYC | Chiffrement AES-256 au repos, affichage sécurisé (web-admin) |
| Secrets | Jamais committés (gitleaks CI), rotation documentée, `INTERNAL_SERVICE_KEY` par environnement |
| Vulnérabilités images | Trivy CI (CRITICAL/HIGH bloquent) ; runtime non-root uid 1000 |

## 8. Définition of Done MVP (10 critères, spec §8.5 — GOURSI-QA4)

1. Un transfer P2P crée **exactement 4 écritures ledger**
2. `@Version` : 10 threads simultanés → aucun solde corrompu
3. Trigger d'immutabilité : `UPDATE ledger_entries` → « Opération interdite »
4. Équilibre comptable : `SUM(CREDIT)-SUM(DEBIT)` = 0 (0 écart, script d'audit)
5. P2P de bout en bout < **10 s**
6. Inscription + KYC < **3 min**
7. **1000 tx/min** (k6, p95 < 2 s, erreur < 0,1 %)
8. USSD : **4 opérations** fonctionnelles sur simulateur
9. **gitleaks 0** finding
10. **ZAP 0** vulnérabilité critique résiduelle

## 9. Liste rouge (erreurs interdites)

1. Montants en float/double
2. Écriture de solde hors ledger
3. Transaction d'écriture non `SERIALIZABLE`
4. `merge()`/`update()` sur une `LedgerEntry`
5. `delete()` sur une écriture ou un AuditLog
6. Transaction sans clé d'idempotence
7. Exception avalée silencieusement
8. `@Autowired` par champ côté Java
9. Secret committé / clé loggée
10. Migration Flyway modifiée après application (nouvelle V7+ pour tout correctif)

---

_Liens : [REVUE-CONSTITUTION.md](REVUE-CONSTITUTION.md) · [TRACABILITY.md](TRACABILITY.md) · [adr/](adr/) · [API.md](API.md) (v0.1, historique)_
