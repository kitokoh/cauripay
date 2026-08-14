# ADR-001 — kyc-service et aml-service sont des services dédiés

- **Statut** : Adoptée · **Date** : 2026-08-14 · **Décideur** : kitokoh (propriétaire)
- **Contexte** : le catalogue initial logeait KYC et AML dans `api-core/src/modules/`, mais le
  tableau d'architecture §1.1 les définit comme services autonomes (ports 3030/3040). KYC et AML
  traitent des données personnelles et réglementaires avec des exigences de sécurité, d'accès et
  d'audit distinctes (documents chiffrés AES-256, listes OFAC/ONU/GABAC, gel de wallet).
- **Décision** : `kyc-service` (port 3030) et `aml-service` (port 3040) sont des services NestJS
  dédiés, chacun avec sa base, ses guards, ses événements (§6). Le tableau §1.1 prime sur les
  chemins `src/modules/` du catalogue GOURSI-024/025.
- **Conséquences** : api-core consomme leurs événements (kyc.approved, aml.wallet.frozen) ; chaque
  service a son propre cycle de vie, sa scalabilité et son périmètre de sécurité. Coût : un service
  à déployer de plus, mitigé par le monorepo et les images Docker standardisées.

# ADR-002 — Le cœur produit est la plateforme wallet GOURSI

- **Statut** : Adoptée · **Date** : 2026-08-14 · **Décideur** : kitokoh (propriétaire)
- **Contexte** : le repo contient un MVP v0.1 « agrégateur de paiement dev-first » (server Fastify +
  dashboard React, mode sandbox). Le backlog GOURSI décrit une plateforme wallet complète (P2P,
  agents, KYC/AML, USSD, marchands) construite sur un ledger Java.
- **Décision** : la cible produit est la **plateforme wallet GOURSI**. L'agrégateur v0.1 existant
  n'est pas la cible : il est conservé en historique (`legacy/`) et ne reçoit plus de
  fonctionnalités. Le ledger-service Java est le cœur comptable unique.
- **Conséquences** : l'architecture cible (§1.1) et le backlog GOURSI font foi ; l'ancien backlog
  (#1-137) est remplacé (voir ADR-003). Les concepts marchands de v0.1 (checkout, webhooks) sont
  repris dans business-service et developer-gateway.

# ADR-003 — Sortie de l'ancien backlog (137 issues)

- **Statut** : Adoptée · **Date** : 2026-08-14 · **Décideur** : kitokoh (propriétaire)
- **Contexte** : 137 issues (#1-#137) couvrent l'ancienne vision (v0.1-v0.4 de l'agrégateur). Le
  backlog GOURSI (#138+) les remplace avec une architecture différente (services dédiés, ledger
  Java, Keycloak, RabbitMQ).
- **Décision** : l'ancien backlog est **fermé en masse** avec un commentaire de référence vers
  cette ADR. Les préoccupations toujours valides (SSRF webhooks, rate limiting par clé, interface
  Provider) sont couvertes par les issues GOURSI équivalentes :
  - webhook SSRF → couvert par GOURSI-SEC1 + business-service webhooks
  - rate limiting par clé → GOURSI-050b
  - interface Provider → GOURSI-030 (payment-rail-contracts)
  - SDK JS/TS → GOURSI-051a ; SDK Flutter → GOURSI-051b
  - Docker/CI → GOURSI-002/005
- **Conséquences** : le backlog ne contient plus qu'une source de vérité (GOURSI). Une issue fermée
  peut être rouverte si un besoin non couvert émerge.

# ADR-004 — Création de wallet vs mutation de solde : la frontière

- **Statut** : Adoptée · **Date** : 2026-08-14 · **Décideur** : kitokoh (propriétaire)
- **Contexte** : à l'inscription, api-core crée User + Wallet + KycRecord dans une `$transaction`
  Prisma. Il faut trancher qui crée le wallet et qui écrit son solde.
- **Décision** :
  - **Création** : api-core crée le wallet (solde 0, statut ACTIVE) côté Prisma à l'inscription.
    C'est une création d'identité, pas une écriture comptable.
  - **Mutation de solde** : exclusivement via `ledger-service` (transferAtomic/credit/debit/reverse).
    api-core n'appelle jamais `prisma.wallet.update({ balance })`.
  - La colonne `wallets.balance` (Prisma) est une vue de consultation/compat, jamais écrite.
- **Conséquences** : cohérence avec la règle absolue n°1 ; le ledger reste la seule vérité des
  soldes ; api-core orchestre, ledger comptabilise.

# ADR-005 — Événement transaction.completed publié par ledger ET api-core (déduplication)

- **Statut** : Adoptée · **Date** : 2026-08-14 · **Décideur** : kitokoh (propriétaire)
- **Contexte** : le ledger émet `financial.events/transaction.completed` (vérité comptable, après
  commit) et api-core émet un événement enrichi (métier, avec walletIds/type). Risque de doublon
  pour les consommateurs.
- **Décision** : les deux événements sont publiés avec le même `transactionId`. Les consommateurs
  (reconciliation-service, notification-service) **dédupliquent par transactionId** (idempotence de
  consommation, stockage des transactionId vus dans Redis/table). Le payload ledger est minimal
  (§6), le payload api-core est enrichi.
- **Conséquences** : chaque consommateur doit implémenter la déduplication par transactionId ;
  aucune suppression d'événement, le ledger garde la vérité comptable (ADR-005 = compromis
  accepté pour la complétude métier).
