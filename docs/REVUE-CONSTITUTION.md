# REVUE-CONSTITUTION.md — Constitution technique de CauriPay

> Document de référence (spec) du projet CauriPay — plateforme wallet & agrégateur de paiement pour l'Afrique centrale et de l'Ouest.
> Statut : **adoptée** · Version : 2.0 · Date : 2026-08-14 · Auteur : kitokoh (propriétaire), consolidée par l'équipe (goursi)
> Ce document fait foi pour le backlog. Toute évolution passe par une ADR (voir `docs/ADR/`).

---

## 1. Architecture cible

### 1.1 Services & ports

Le système est une plateforme **wallet GOURSI** : portefeuilles mobiles (mobile money), transactions
P2P, cash-in/cash-out par agents, KYC/AML, et un agrégateur marchand (business-service) branché sur
le même cœur comptable. Le cœur est un **ledger-service Java** — SEUL service autorisé à écrire les
soldes des wallets (règle absolue n°1).

| Service | Port | Techno | Rôle |
|---|---|---|---|
| api-core | 3000 | NestJS + Prisma | Orchestrateur : auth, transactions, intégration ledger |
| ledger-service | 3010 | Java 21 / Spring Boot 3.2 | **Cœur comptable** : écrit les soldes, ledger immuable |
| business-service | 3020 | NestJS | Paiements marchands, webhooks, bulk, stats |
| kyc-service | 3030 | NestJS | KYC des utilisateurs (documents chiffrés) |
| aml-service | 3040 | NestJS | Scoring risque, listes OFAC/ONU/GABAC, alertes |
| notification-service | 3050 | NestJS | Canaux SMS, Email, Push FCM, WhatsApp |
| ussd-service | 3060 | NestJS | Menu USSD (FR+AR) : solde, envoi, facture, retrait |
| reconciliation-service | 3070 | NestJS | Rapprochement quotidien, rapports CSV/PDF |
| developer-gateway | 3080 | NestJS | API keys, rate limiting, webhooks sortants (Phase 3) |
| web-admin | 5174 | Next.js | Back-office (Keycloak OIDC + RBAC) |
| web-business | 5175 | Next.js | Espace marchand (2FA obligatoire) |
| mobile-customer | — | Flutter | App client (PIN, P2P, solde, factures) |
| mobile-agent | — | Flutter | App agent (cash-in/out, float, commissions) |

Infrastructure (docker compose) : **PostgreSQL 16** (unique, schéma `ledger` + schéma `public`),
**Redis 7** (idempotence, OTP, sessions, lockout), **RabbitMQ 3** (exchanges/queues §6),
**Keycloak** (realm `goursi`, JWT RS256), **Prometheus + Grafana** (observabilité).

### 1.2 Communications inter-services

- **HTTP interne** avec header `X-Service-Key` (secret partagé, injecté par environnement, comparé en
  temps constant côté Java). Jamais exposé publiquement.
- **JWT Keycloak RS256** pour l'authentification des clients (guards NestJS, issuer/jwks configurés).
- **RabbitMQ** pour les événements métier (§6) — publish après commit uniquement.
- Rôles Keycloak : `CUSTOMER, MERCHANT, AGENT, DISTRIBUTOR, SUPER_ADMIN, COMPLIANCE_OFFICER,
  SUPPORT_L1, SUPPORT_L2, FINANCE_MANAGER, OPS_AGENT_MANAGER`.

---

## 2. Principes transverses

1. **Règle absolue n°1** — Seul ledger-service écrit les soldes (`ledger_balances`). Aucun autre
   service ne fait `UPDATE wallets SET balance` (Prisma ou autre). Les autres services lisent le solde
   via l'API HTTP du ledger.
2. **Règle absolue n°2** — Les montants sont des **BigDecimal / Decimal(15,2)** partout. Jamais de
   double/float pour de l'argent (Java) ni de `number` flottant (TS). Type partagé `Decimal`/string.
3. **Idempotence** — Toute écriture financière exige une `IdempotencyKey` (Redis TTL 24 h côté ledger,
   header `X-Idempotency-Key` obligatoire côté api-core/business).
4. **Immutabilité** — `ledger_entries` est physiquement immuable (triggers V5) : aucun UPDATE/DELETE,
   même par accident. Pas de `deletedAt` sur les entités financières.
5. **Conventional Commits** — `feat|fix|chore|docs|test(scope GOURSI-XXX): description`.
6. **Branches** — `feat/GOURSI-XXX-description`, PR vers `main`, merge squash, branche supprimée.
7. **Secret hygiene** — Aucun secret versionné ; `.env.example` documenté, gitleaks en CI.

---

## 3. ledger-service (Java) — spec

### 3.1 Concepts
- **LedgerEntry** : écriture comptable immuable (id UUID, transactionId, walletId, direction
  DEBIT/CREDIT, amount, balanceBefore, balanceAfter, entryType, description, createdAt).
- **LedgerBalance** : solde courant par wallet (balance, frozenBalance, available = balance - frozen,
  `@Version` pour verrou optimiste).
- **LedgerCheckpoint** : snapshot nightly (walletId, balanceSnapshot, entriesCount, createdAt),
  unicité (wallet_id, date).
- **IdempotencyService** : déduplication par clé (Redis, TTL 24 h configurable).

### 3.2 Dépendances Maven (pom.xml)
`spring-boot-starter-web`, `data-jpa`, `security`, `actuator`, `amqp`, `postgresql`, `flyway-core`,
`data-redis`, `micrometer-registry-prometheus`, `lombok`, `mapstruct 1.5.5.Final`, `validation`,
`spring-boot-starter-test`, `testcontainers-postgresql`.

### 3.3 LedgerEntry (GOURSI-012a)
`@Immutable` + factory `create(...)` qui calcule `balanceAfter = balanceBefore ± amount`, force
`scale(2, HALF_UP)`. Enums : `LedgerDirection { DEBIT, CREDIT }`,
`EntryType { PRINCIPAL, FEE, COMMISSION, REVERSAL }`. Aucun setter public.

### 3.4 LedgerBalance (GOURSI-012b)
`getAvailableBalance() = balance - frozenBalance`, `credit(BigDecimal)` (montant ≤ 0 →
IllegalArgumentException), `debit(BigDecimal)` (insuffisant → InsufficientFundsException).
Repository : `findByWalletIdForUpdate` (PESSIMISTIC_WRITE).

### 3.5 Commandes (GOURSI-013a)
Records Java 21 avec validation dans le compact constructor :
- `TransferCommand(idempotencyKey, transactionId, fromWalletId, toWalletId, amount, feeAmount,
  platformFeesWalletId, description)` — scale ≤ 2, from ≠ to.
- `CreditCommand(idempotencyKey, walletId, amount, transactionId, entryType)`
- `DebitCommand(...)` idem.

### 3.6 Écritures (GOURSI-014)
- **transferAtomic** : `@Transactional(isolation = SERIALIZABLE)`, exactement **4 LedgerEntry**
  (débit principal, crédit principal, débit frais, crédit platform fees) avec descriptions
  « Envoi P2P » / « Réception P2P » / « Frais » / « Frais collectés ». Ordre : 1) idempotence
  2) lock ×3 (from, to, platformFees) 3) contrôle fonds 4) 4 entries 5) mutations balance
  6) saveAll 7) résultat 8) store idempotence 9) événement.
- **credit / debit** : 1 entrée + mutation de solde, mêmes protections.
- **reverse** : écritures miroir `EntryType.REVERSAL` (net = 0), idempotent, impossible 2×.

### 3.7 Sécurité (GOURSI-010b)
`ServiceKeyFilter` (OncePerRequestFilter) : comparaison `MessageDigest.isEqual` (temps constant),
401 `{ error: "Unauthorized", code: "INVALID_SERVICE_KEY" }`. Whitelist `/actuator/health`,
`/actuator/prometheus`.

### 3.8 Schéma base (Flyway, GOURSI-011)
- V1 : `CREATE SCHEMA IF NOT EXISTS ledger` + extension uuid-ossp
- V2 : `ledger.ledger_entries` (id UUID PK, transaction_id, wallet_id, direction CHECK IN
  ('DEBIT','CREDIT'), amount NUMERIC(15,2) CHECK > 0, balance_before, balance_after, entry_type,
  description, created_at) + index (transaction), (wallet, date)
- V3 : `ledger.ledger_balances` (wallet_id PK, balance DEFAULT 0 CHECK >= 0, frozen_balance
  CHECK >= 0, version BIGINT DEFAULT 0, last_updated_at)
- V4 : `ledger.ledger_checkpoints` + unicité (wallet_id, date(checkpoint))
- V5 : triggers immutabilité (`prevent_mutation()` sur ledger_entries ; `check_balance_positive()`
  sur ledger_balances)
- V6 : vues audit en lecture (`audit.ledger_entries_view`, `audit.balance_view`)
- Hibernate `ddl-auto=validate` — le DDL n'est géré que par Flyway. Migrations strictement
  croissantes, jamais modifiées une fois appliquées.

### 3.9 Configuration (application.yml)
`datasource ${LEDGER_DATABASE_URL}`, Hikari 20/5, jpa validate, default_schema ledger, flyway
schemas ledger, redis ${REDIS_URL}, rabbitmq ${RABBITMQ_URL}, port `${LEDGER_PORT:3010}`,
prometheus, `goursi.internal.service-key`, `goursi.ledger.idempotency-ttl-hours: 24`,
`checkpoint-cron: "0 0 2 * * *"`. Actuator exposé sur health, info, metrics, prometheus.
Config Java : `@ConfigurationProperties` avec refus de démarrage si variable manquante.

---

## 4. api-core (NestJS) — spec

### 4.1 Bootstrap (GOURSI-020)
Port 3000, préfixe global `/api/v1`, ValidationPipe global (whitelist + transform), helmet,
CORS limité. `ConfigModule.forRoot` avec validation de schéma env (refus au démarrage).
PrismaService global. GET /health.

### 4.2 Ledger client (GOURSI-022)
`LedgerClientService` : HTTP vers `{LEDGER_SERVICE_URL}/internal/ledger/*` avec `X-Service-Key`,
timeout 10 s, retry limité (1×) sur erreur réseau pure (pas sur 4xx métier). Erreurs propagées
(LedgerServiceException), jamais avalées.

### 4.3 Flux P2P (GOURSI-023b, ordre exact)
1) idempotence (X-Idempotency-Key, retour de l'existante) 2) wallet source ACTIVE + kycLevel
3) checkKycLimit 4) calculateFee('P2P') 5) wallet destination par accountNumber
6) Transaction PENDING (expiresAt +30 min) 7) ledger.transferAtomic 8) SUCCESS + processedAt +
metadata.ledgerEntryIds 9) événement financial.transaction.completed + maj dailyTotal/monthlyTotal.
Échec ledger → FAILED + failureReason + erreur propagée.

### 4.4 Modèle Prisma (schéma `public`)
Enums : `TransactionStatus, TransactionType, KycLevel, WalletType, WalletStatus, UserRole`.
- **Wallet** : id uuid, userId, walletType, currency XAF, balance + frozenBalance Decimal(15,2),
  kycLevel, status, accountNumber unique, dailyTotal + monthlyTotal Decimal(15,2), created/updatedAt.
  ⚠ balance = consultation uniquement, JAMAIS écrit par Prisma.
- **Transaction** : id uuid, idempotencyKey unique, from/toWalletId, type, status, amount +
  feeAmount Decimal(15,2), currency, feeBreakdown/metadata Json, failureReason, reversedById,
  parentId, expiresAt, processedAt.
- **KycRecord**, **AuditLog** (insert-only, pas d'updatedAt).
- `id String @id @default(uuid()) @db.Uuid` partout. Aucun Float.

### 4.5 Machine à états Transaction (GOURSI-023a)
`PENDING → PROCESSING → SUCCESS|FAILED`, `→ REVERSED`, `→ EXPIRED`, `→ MANUAL_REVIEW`.
Transition invalide → 409 `{ code: 'INVALID_TRANSITION' }`. Chaque transition émet un événement.

---

## 5. Contrats API

### 5.1 Auth (api-core, /api/v1/auth)
- POST /register { phoneNumber, fullName, mpin } → 201 { userId, walletId, kycLevel: 'BASIC' }
  ($transaction : User + Wallet CUSTOMER solde 0 + KycRecord BASIC ; mpin bcrypt coût 12)
- POST /login { phoneNumber, mpin } → { accessToken, refreshToken, expiresIn: 900 } ;
  3 échecs → blocage 30 min (Redis TTL 1800 s)
- POST /verify-otp { phoneNumber, otp } → { verified: true } (OTP 6 chiffres, TTL 300 s, 5 essais)
- POST /refresh, POST /change-mpin
- Routes publiques : register, login, refresh, verify-otp, health. Le reste : Bearer JWT RS256.

### 5.2 Wallets & transactions (api-core)
- GET /wallets/me/balance → ledger.getBalance → { balance, frozenBalance, availableBalance }
  (JAMAIS Prisma)
- GET /wallets/me/history?cursor&limit&type → entries ledger paginées (curseur, pas d'offset)
- POST /transactions/transfer (X-Idempotency-Key requis)
- POST /transactions/cash-in (agent, OTP), /transactions/cash-out (agent, OTP client)
- GET /transactions/:id/receipt ; POST /transactions/:id/reverse (SUPPORT_L2+)

### 5.3 KYC / AML / back-office
- kyc-service : POST /kyc/submit (documents chiffrés AES-256, statut PENDING), file
  COMPLIANCE_OFFICER (approve/reject → kycLevel à jour)
- aml-service : scoring risque 0-100 (seuil 70), listes OFAC/ONU/GABAC, gel wallet (FROZEN),
  endpoints alertes + workflow (review/confirm/false positive)
- web-admin (Next.js + Keycloak OIDC + RBAC) : utilisateurs, transactions + journal d'audit,
  file KYC, alertes AML, agents + reporting
- web-business (Next.js + 2FA) : dashboard paiements, upload CSV (preview validation), export
  réconciliation

### 5.4 Ledger HTTP interne (codes)
`POST /internal/ledger/transfer|credit|debit|reverse`, `GET /internal/ledger/balance/{walletId}`,
`POST /internal/ledger/verify`.
Codes : 200 OK · 401 INVALID_SERVICE_KEY · 404 WALLET_NOT_FOUND · 409 IDEMPOTENCY_CONFLICT /
OPTIMISTIC_LOCK · 422 VALIDATION_ERROR / INSUFFICIENT_FUNDS. Enveloppe d'erreur `{ code, message,
details }` (+ `{ success: false }`).

---

## 6. Topologie événementielle RabbitMQ

Naming : `domain.entity.event`. Exchanges (direct/fanout selon usage) :

| Exchange | Routing keys | Consommateurs |
|---|---|---|
| financial.events | transaction.completed, transaction.failed, transaction.reversed | q.reconciliation.financial, api-core |
| kyc.events | kyc.submitted, kyc.approved, kyc.rejected | api-core, q.kyc.approved |
| aml.events | aml.alert.created, aml.wallet.frozen | api-core (gel wallet), q.aml.created |
| notification.events (fanout) | — | q.notification.all (notification-service) |
| audit.events (fanout) | — | q.audit.insert (audit log) |

Chaque queue consommatrice a une **DLQ** (`q.<name>.dlq`). Aucune queue auto-nommée pour les
consumers métier. Payload minimal des événements financiers :
`{ transactionId, type, amount, status, walletIds }`.

---

## 7. Blocs d'implémentation (backlog GOURSI)

| Bloc | Portée | Issues |
|---|---|---|
| **G0 — Fondation & Infrastructure** | monorepo, configs, docker compose, Makefile, packages partagés, CI, Keycloak, RabbitMQ, observabilité, secrets | #138-#152 |
| **G1 — ledger-service (Java)** | cœur comptable (règle absolue n°1) | #154-#179 |
| **G2 — api-core & services réglementaires** | api-core, kyc, aml, notification, ussd | #181-#217 |
| **G3 — business-service & reconciliation** | rails paiement, webhooks marchand, bulk, reconciliation | #218-#230 |
| **G4 — Fronts & Mobile** | web-admin, web-business, mobile-customer, mobile-agent | #233-#254 |
| **G5 — Developer Platform** | developer-gateway, SDK JS, SDK Flutter, docs | #255-#260 |
| **G6 — QA, Sécurité & DoD** | k6, audits SQL, ZAP, DoD, docs, ADRs | #261-#268 |

---

## 8. Garanties & DoD

### 8.1 Liste rouge Java (non négociable)
1. Jamais double/float pour les montants → BigDecimal.
2. Jamais `@Transactional` sans isolation explicite sur les writes → SERIALIZABLE.
3. Jamais `merge()`/`update()` sur LedgerEntry (immuable).
4. Jamais `delete()` sur LedgerEntry.
5. IdempotencyKey obligatoire sur toute écriture financière.
6. Jamais d'exception avalée : `catch (e) { log.error(); throw; }`.
7. Pas de `deletedAt` sur les entités financières.
8. Pas de `getBalance().doubleValue()`.

### 8.2 Liste rouge TS (non négociable)
1. Jamais `prisma.wallet.update({ balance })` — soldes via ledger uniquement.
2. Jamais de `number` flottant pour les montants → Decimal/string.
3. `id String @id @default(uuid()) @db.Uuid` partout.
4. Header `X-Idempotency-Key` obligatoire sur les écritures.
5. Pas de `deletedAt` sur Transaction.
6. Les erreurs ledger sont propagées, jamais avalées.

### 8.3 Tests contractuels ledger (repris tels quels)
- `transferAtomic_creates_exactly_4_entries`
- `transferAtomic_idempotent_same_key_no_duplicate` (même clé 2× → même transactionId,
  count = initial + 4)
- `transferAtomic_throws_on_insufficient_funds` (9999999 → InsufficientFundsException
  « Solde insuffisant »)
- Concurrence : 10 threads simultanés sur WALLET_A → solde final exact
  `INITIAL_BALANCE - (10000 × réussites)`, entries = 4 × réussites, aucune corruption.

### 8.4 Requêtes SQL de contrôle (audit)
- Immutabilité : tentative UPDATE/DELETE sur ledger_entries → erreur « Opération interdite ».
- Équilibre comptable (par wallet) :
  `SELECT wallet_id, SUM(CASE WHEN direction='CREDIT' THEN amount ELSE -amount END) computed
   FROM ledger.ledger_entries GROUP BY wallet_id` vs `ledger_balances.balance` → delta = 0.
- Contrôle global : 0 ligne d'écart sur données propres.

### 8.5 Définition of Done MVP (10 critères)
1. transferAtomic = 4 entries · trigger immutabilité actif · équilibre comptable 0 écart.
2. Test 10 threads vert (aucun double débit).
3. Tests 200/401/422 (contrat HTTP ledger).
4. KYC : approve → kycLevel à jour ; alerte AML → wallet FROZEN.
5. USSD : 4 opérations complètes.
6. Inscription KYC < 3 min.
7. La plateforme tient 1000 transactions/min sans dégradation (k6, p95 < 2 s, erreur < 0,1 %).
8. Simulation de bout en bout : register → login → transfer P2P → webhook/reçu.
9. gitleaks 0 finding · Trivy : aucune image CRITICAL/HIGH.
10. 0 vulnérabilité critique (CVSS > 9) au pentest automatisé (OWASP ZAP).

---

## 9. Environnement local

`make install` → `make up` (compose : postgres, redis, rabbitmq, keycloak, prometheus, grafana)
→ `make migrate` → `make seed` → `make test` (jest TS) + `make test-java` (mvn). CI : lint TS +
tsc + jest + mvn test sur chaque PR ; security scan (gitleaks + trivy) ; déploiement staging sur
push main. Voir `docs/ADR/`, `docs/DEPLOYMENT.md`, `docs/SECURITY.md`.
