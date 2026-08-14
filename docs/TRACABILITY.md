# TRACABILITY — Matrice spec ↔ backlog

> Générée depuis le backlog GOURSI (134 issues). Mise à jour : 2026-08-14.

Chaque exigence de la spec est tracée vers une issue ; chaque issue porte sa clé GOURSI dans son corps. Cette matrice est la preuve de couverture de la Phase 0 (GOURSI-QA7).


## EPIC (7 issues)

| Clé | Issue | Titre |
|---|---|---|
| EPIC-G0 | #153 | EPIC-G0 · ÉPIC — Bloc G0 : Fondation & Infrastructure (Phase 0) |
| EPIC-G1 | #180 | EPIC-G1 · ÉPIC — Bloc G1 : ledger-service Java (cœur comptable) |
| EPIC-G2 | #231 | EPIC-G2 · ÉPIC — Bloc G2 : api-core & services réglementaires |
| EPIC-G3 | #232 | EPIC-G3 · ÉPIC — Bloc G3 : business-service & reconciliation |
| EPIC-G4 | #269 | EPIC-G4 · ÉPIC — Bloc G4 : Fronts & Mobile |
| EPIC-G5 | #270 | EPIC-G5 · ÉPIC — Bloc G5 : Developer Platform (Phase 3) |
| EPIC-G6 | #271 | EPIC-G6 · ÉPIC — Bloc G6 : QA, Sécurité & DoD |

## G0 (fondation) (15 issues)

| Clé | Issue | Titre |
|---|---|---|
| GOURSI-001 | #138 | GOURSI-001 · Monorepo : racine npm workspaces + configs globales |
| GOURSI-001b | #139 | GOURSI-001b · .env.example complet : 26 variables documentées + validation config |
| GOURSI-002a | #140 | GOURSI-002a · Docker Compose : services de base (Postgres 16, Redis, RabbitMQ, Keycloak, Prometheus, Grafana) + healthchecks |
| GOURSI-002b | #141 | GOURSI-002b · Dockerfiles : Dockerfile.nestjs (multi-stage) + Dockerfile.java (JRE 21 slim) |
| GOURSI-002c | #142 | GOURSI-002c · docker-compose.override.yml : dev (volumes, hot-reload, seed Keycloak) |
| GOURSI-003 | #143 | GOURSI-003 · Makefile unifié : cibles Java + NestJS (install/up/down/migrate/seed/test/test-java/lint/studio) |
| GOURSI-004a | #144 | GOURSI-004a · packages/shared-types : types partagés (enveloppes, enums, contrats HTTP) |
| GOURSI-004b | #145 | GOURSI-004b · packages/validation-rules : checkKycLimit, calculateFee, validatePhoneNumber + tests |
| GOURSI-005a | #146 | GOURSI-005a · CI GitHub Actions : lint TS + tsc + jest + mvn test sur PR |
| GOURSI-005b | #147 | GOURSI-005b · Security scan CI : gitleaks + trivy (CRITICAL/HIGH) |
| GOURSI-005c | #148 | GOURSI-005c · Déploiement staging : build images + compose staging + migrations auto |
| GOURSI-KC1 | #149 | GOURSI-KC1 · Keycloak : realm goursi, clients, clés RS256, rôles — seed idempotent |
| GOURSI-OBS1 | #151 | GOURSI-OBS1 · Observabilité : /health standard + /metrics Prometheus + dashboards Grafana |
| GOURSI-RMQ1 | #150 | GOURSI-RMQ1 · Topologie RabbitMQ déclarée : exchanges, queues, bindings (idempotent) |
| GOURSI-SEC1 | #152 | GOURSI-SEC1 · Gestion des secrets & clés internes : conventions, rotation, X-Service-Key |

## G1 (ledger) (26 issues)

| Clé | Issue | Titre |
|---|---|---|
| GOURSI-010a | #154 | GOURSI-010a · Bootstrap Spring Boot 3.2 : pom.xml, application.yml, LedgerServiceApplication, /actuator/health |
| GOURSI-010b | #155 | GOURSI-010b · ServiceKeyFilter : X-Service-Key en temps constant + 401 |
| GOURSI-010c | #156 | GOURSI-010c · GlobalExceptionHandler + enveloppe d'erreur structurée |
| GOURSI-011a | #157 | GOURSI-011a · Flyway V1–V3 : schéma ledger, ledger_entries, ledger_balances |
| GOURSI-011b | #158 | GOURSI-011b · Flyway V4 : ledger_checkpoints (snapshot nightly) |
| GOURSI-011c | #159 | GOURSI-011c · Flyway V5–V6 : triggers immutabilité + solde non négatif + vues audit |
| GOURSI-011d | #160 | GOURSI-011d · Tests d'acceptation des migrations (immutabilité + contraintes) |
| GOURSI-012a | #161 | GOURSI-012a · LedgerEntry + enums + factory : entité immuable |
| GOURSI-012b | #162 | GOURSI-012b · LedgerBalance + @Version (optimistic lock) |
| GOURSI-012c | #163 | GOURSI-012c · LedgerCheckpoint : entité + repository |
| GOURSI-013a | #164 | GOURSI-013a · Records de commandes : TransferCommand, CreditCommand, DebitCommand (validation) |
| GOURSI-013b | #165 | GOURSI-013b · Records de résultats : TransferResult, BalanceResult, LedgerEntryResponse |
| GOURSI-014a | #166 | GOURSI-014a · IdempotencyService + RedisIdempotencyStore (TTL 24h) |
| GOURSI-014b | #167 | GOURSI-014b · LedgerWriteService.transferAtomic : 4 écritures ledger atomiques |
| GOURSI-014c | #168 | GOURSI-014c · LedgerWriteService.credit() et debit() |
| GOURSI-014d | #169 | GOURSI-014d · LedgerWriteService.reverse() : écritures miroir |
| GOURSI-014e | #170 | GOURSI-014e · LedgerEventPublisher : RabbitMQ financial.events |
| GOURSI-014f | #171 | GOURSI-014f · Tests de concurrence : 10 threads simultanés → pas de corruption de solde |
| GOURSI-014g | #172 | GOURSI-014g · Tests idempotence + insuffisance de fonds (transferAtomic) |
| GOURSI-015a | #173 | GOURSI-015a · DTOs API + mapping MapStruct |
| GOURSI-015b | #174 | GOURSI-015b · LedgerController : endpoints /internal/ledger/* (transfer, credit, debit, reverse, balance, verify) |
| GOURSI-015c | #175 | GOURSI-015c · Tests d'intégration MockMvc + Testcontainers (401/422/200/balance) |
| GOURSI-016a | #176 | GOURSI-016a · LedgerReadService : soldes + historique paginé (lecture seule) |
| GOURSI-016b | #177 | GOURSI-016b · CheckpointScheduler : snapshot nightly (cron 2h, Spring Batch) |
| GOURSI-016c | #178 | GOURSI-016c · LedgerVerifyService : contrôle d'intégrité COBAC (SUM vs balance) |
| GOURSI-LED1 | #179 | GOURSI-LED1 · Métriques Prometheus ledger (timers, compteurs d'erreurs) |

## G2 (api-core/réglementaire) (37 issues)

| Clé | Issue | Titre |
|---|---|---|
| GOURSI-020a | #181 | GOURSI-020a · Bootstrap api-core NestJS : main.ts, AppModule, PrismaService, validation config |
| GOURSI-020b | #182 | GOURSI-020b · Guards globaux : JWT Keycloak RS256 + rôles |
| GOURSI-020c | #183 | GOURSI-020c · Interceptor enveloppe + exception filter + log requêtes lentes |
| GOURSI-020d | #184 | GOURSI-020d · Swagger : /api/v1/docs avec tags et schémas |
| GOURSI-021a | #185 | GOURSI-021a · Schéma Prisma : User, Wallet, KycRecord + migration |
| GOURSI-021b | #186 | GOURSI-021b · POST /auth/register : User + Wallet + KycRecord en une $transaction (bcrypt) |
| GOURSI-021c | #187 | GOURSI-021c · POST /auth/login : JWT + verrouillage 3 essais (Redis 30 min) |
| GOURSI-021d | #188 | GOURSI-021d · POST /auth/verify-otp : OTP SMS 6 chiffres (Redis TTL 5 min) |
| GOURSI-021e | #189 | GOURSI-021e · POST /auth/refresh + stratégie Keycloak complète |
| GOURSI-021f | #190 | GOURSI-021f · POST /auth/change-mpin |
| GOURSI-021g | #191 | GOURSI-021g · Tests auth : register, login, lockout, OTP, refresh, change-mpin |
| GOURSI-022a | #192 | GOURSI-022a · LedgerClientService : HTTP vers ledger-service (X-Service-Key, timeout 10 s) |
| GOURSI-022b | #193 | GOURSI-022b · DTOs ledger + tests LedgerClient (mock HttpService) |
| GOURSI-023a | #194 | GOURSI-023a · Modèle Transaction Prisma + machine à états (transitions invalides 409) |
| GOURSI-023b | #195 | GOURSI-023b · POST /transactions/transfer : orchestration P2P complète (idempotence → KYC → frais → ledger) |
| GOURSI-023c | #196 | GOURSI-023c · FeesService + LimitsService (frais, limites KYC, totaux journaliers) |
| GOURSI-023d | #197 | GOURSI-023d · POST /transactions/cash-in + confirm (agent, OTP 5 min) |
| GOURSI-023e | #198 | GOURSI-023e · POST /transactions/cash-out (agent, OTP client) |
| GOURSI-023f | #199 | GOURSI-023f · GET /wallets/me/balance + /wallets/me/history (via ledger — JAMAIS Prisma) |
| GOURSI-023g | #200 | GOURSI-023g · GET /transactions/:id/receipt : reçu partageable (PDF/image) |
| GOURSI-023h | #201 | GOURSI-023h · POST /transactions/:id/reverse (SUPPORT_L2+) + événements |
| GOURSI-023i | #202 | GOURSI-023i · Tests E2E transactions (Supertest) : transfer, idempotence, 422, cash-in/out, reverse |
| GOURSI-024a | #203 | GOURSI-024a · kyc-service : bootstrap + POST /kyc/submit (documents chiffrés AES-256, PENDING) |
| GOURSI-024b | #204 | GOURSI-024b · kyc-service : approve/reject + mise à jour kycLevel + événements |
| GOURSI-024c | #205 | GOURSI-024c · kyc-service : file de validation COMPLIANCE_OFFICER + tests |
| GOURSI-025a | #206 | GOURSI-025a · aml-service : bootstrap + scoring de risque (0-100, seuil 70) |
| GOURSI-025b | #207 | GOURSI-025b · aml-service : filtrage listes OFAC/ONU/GABAC + gel wallet |
| GOURSI-025c | #208 | GOURSI-025c · aml-service : endpoints alertes + workflow (review, confirm, false positive) |
| GOURSI-025d | #209 | GOURSI-025d · api-core : consumer aml.events → gel wallet (FROZEN) |
| GOURSI-026a | #210 | GOURSI-026a · notification-service : bootstrap + consumer RabbitMQ + persistance des notifications |
| GOURSI-026b | #211 | GOURSI-026b · notification-service : canaux SMS + Email |
| GOURSI-026c | #212 | GOURSI-026c · notification-service : canaux Push FCM + WhatsApp |
| GOURSI-026d | #213 | GOURSI-026d · notification-service : retry/backoff + DLQ + statuts |
| GOURSI-027a | #214 | GOURSI-027a · ussd-service : bootstrap + sessions stateful Redis (TTL 180 s) |
| GOURSI-027b | #215 | GOURSI-027b · ussd-service : menu hiérarchisé FR+AR (1=Solde 2=Envoyer 3=Facture 4=Retrait) |
| GOURSI-027c | #216 | GOURSI-027c · ussd-service : endpoint USSD + intégration api-core (solde, envoi) |
| GOURSI-027d | #217 | GOURSI-027d · ussd-service : simulateur + tests 4 opérations complètes |

## G3 (business/réconciliation) (13 issues)

| Clé | Issue | Titre |
|---|---|---|
| GOURSI-030a | #218 | GOURSI-030a · packages/payment-rail-contracts : contrat IRailAdapter |
| GOURSI-030b | #219 | GOURSI-030b · business-service : bootstrap + PaymentRouter (résolution par rail) |
| GOURSI-030c | #220 | GOURSI-030c · GoursiRailAdapter MVP : transferAtomic via ledger |
| GOURSI-030d | #221 | GOURSI-030d · Tests router + adapter + preuve d'extensibilité (rail factice) |
| GOURSI-031a | #222 | GOURSI-031a · MerchantsModule : payment-request + QR code |
| GOURSI-031b | #223 | GOURSI-031b · Webhooks marchand signés HMAC-SHA256 (délivrés après SUCCESS) |
| GOURSI-031c | #224 | GOURSI-031c · Stats marchand : volumes par période |
| GOURSI-032a | #225 | GOURSI-032a · Bulk : upload CSV + validation (1000 lignes < 5 s) |
| GOURSI-032b | #226 | GOURSI-032b · Bulk : workflow maker-checker (DRAFT→PENDING_APPROVAL→APPROVED→PROCESSING→COMPLETED) |
| GOURSI-032c | #227 | GOURSI-032c · Bulk : transactions enfants (parentId) + exécution + exports |
| GOURSI-033a | #228 | GOURSI-033a · reconciliation-service : bootstrap + cron journalier + équilibre comptable |
| GOURSI-033b | #229 | GOURSI-033b · Rapports CSV/PDF + statut BALANCED/UNBALANCED |
| GOURSI-033c | #230 | GOURSI-033c · Tests reconciliation (rapports, détection d'écart) |

## G4 (fronts/mobile) (22 issues)

| Clé | Issue | Titre |
|---|---|---|
| GOURSI-040a | #233 | GOURSI-040a · mobile-customer : scaffold Flutter + core (api client, auth storage, theming) |
| GOURSI-040b | #234 | GOURSI-040b · mobile-customer : login PIN 6 chiffres + inscription |
| GOURSI-040c | #235 | GOURSI-040c · mobile-customer : solde + historique (via api-core → ledger) |
| GOURSI-040d | #236 | GOURSI-040d · mobile-customer : parcours P2P en 6 étapes |
| GOURSI-040e | #237 | GOURSI-040e · mobile-customer : factures + notifications |
| GOURSI-040f | #238 | GOURSI-040f · mobile-customer : support RTL arabe + localisation FR/AR |
| GOURSI-040g | #239 | GOURSI-040g · mobile-customer : build release APK < 25 Mo + tests |
| GOURSI-041a | #240 | GOURSI-041a · mobile-agent : scaffold Flutter + auth agent |
| GOURSI-041b | #241 | GOURSI-041b · mobile-agent : float + alertes seuil |
| GOURSI-041c | #242 | GOURSI-041c · mobile-agent : parcours cash-in (OTP) |
| GOURSI-041d | #243 | GOURSI-041d · mobile-agent : parcours cash-out |
| GOURSI-041e | #244 | GOURSI-041e · mobile-agent : commissions + historique offline SQLite |
| GOURSI-042a | #245 | GOURSI-042a · web-admin : scaffold Next.js + Keycloak OIDC + RBAC |
| GOURSI-042b | #246 | GOURSI-042b · web-admin : gestion utilisateurs |
| GOURSI-042c | #247 | GOURSI-042c · web-admin : transactions + journal d'audit (lecture) |
| GOURSI-042d | #248 | GOURSI-042d · web-admin : file KYC (approbation/rejet) |
| GOURSI-042e | #249 | GOURSI-042e · web-admin : alertes AML + actions |
| GOURSI-042f | #250 | GOURSI-042f · web-admin : agents + reporting |
| GOURSI-043a | #251 | GOURSI-043a · web-business : scaffold Next.js + 2FA obligatoire |
| GOURSI-043b | #252 | GOURSI-043b · web-business : dashboard paiements |
| GOURSI-043c | #253 | GOURSI-043c · web-business : upload CSV avec preview de validation |
| GOURSI-043d | #254 | GOURSI-043d · web-business : export réconciliation |

## G5 (dev platform) (6 issues)

| Clé | Issue | Titre |
|---|---|---|
| GOURSI-050a | #255 | GOURSI-050a · developer-gateway : bootstrap + API keys (Phase 3) |
| GOURSI-050b | #256 | GOURSI-050b · developer-gateway : rate limiting 1000 req/min par clé |
| GOURSI-050c | #257 | GOURSI-050c · developer-gateway : webhooks sortants signés + mode sandbox complet |
| GOURSI-051a | #258 | GOURSI-051a · @goursi/js-sdk : package npm (payments, verifySignature) |
| GOURSI-051b | #259 | GOURSI-051b · goursi_flutter : package Dart (pub.dev) |
| GOURSI-051c | #260 | GOURSI-051c · Docs SDK + exemples bout en bout |

## G6 (QA) (8 issues)

| Clé | Issue | Titre |
|---|---|---|
| GOURSI-ADR1 | #267 | GOURSI-ADR1 · ADR : arbitrages de conception (kyc/aml dédiés, cœur produit, sort de l'ancien backlog, création de wallet) |
| GOURSI-QA1 | #261 | GOURSI-QA1 · Test de charge k6 : P2P 1000 tx/min (p95 < 2 s, erreur < 0,1 %) |
| GOURSI-QA2 | #262 | GOURSI-QA2 · Scripts d'audit SQL : immutabilité + équilibre comptable (0 écart) |
| GOURSI-QA3 | #263 | GOURSI-QA3 · OWASP ZAP baseline : api-core + correction findings critiques |
| GOURSI-QA4 | #264 | GOURSI-QA4 · Vérification DoD MVP : checklist 10 critères (spec §8.5) |
| GOURSI-QA5 | #265 | GOURSI-QA5 · Documentation architecture : README v2, DESIGN v2, schémas, ADR |
| GOURSI-QA6 | #266 | GOURSI-QA6 · Onboarding dev : scripts bootstrap + guide environnement |
| GOURSI-QA7 | #268 | GOURSI-QA7 · Audit fin de Phase 0 : couverture spec ↔ backlog |
