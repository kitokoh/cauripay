# Registre ADR — CauriPay

> Architecture Decision Records. Une ADR adoptée ne se change que par une nouvelle ADR (RFC 2119).
> Format : Contexte / Décision / Conséquences.

| # | Titre | Statut | Date |
|---|---|---|---|
| [ADR-001](adr-001-kyc-aml-services-dedies.md) | kyc-service et aml-service sont des services dédiés | Adoptée | 2026-08-14 |
| [ADR-002](adr-002-coeur-produit-wallet-goursi.md) | Le cœur produit est la plateforme wallet GOURSI | Adoptée | 2026-08-14 |
| [ADR-003](adr-003-sortie-ancien-backlog.md) | Sortie de l'ancien backlog (137 issues) | Adoptée | 2026-08-14 |
| [ADR-004](adr-004-creation-wallet-vs-solde.md) | Création de wallet vs mutation de solde : la frontière | Adoptée | 2026-08-14 |
| [ADR-005](adr-005-evenement-completed-de-duplique.md) | transaction.completed par ledger ET api-core (déduplication) | Adoptée | 2026-08-14 |

## Mapping ancien backlog → backlog GOURSI (ADR-003)

| Ancienne issue | Couverture GOURSI |
|---|---|
| #1 SSRF webhooks | GOURSI-SEC1 + business-service webhooks |
| #3 Rate limiting par clé | GOURSI-050b |
| #8 Interface Provider | GOURSI-030 (payment-rail-contracts) |
| #23 SDK TS | GOURSI-051a |
| #26 SDK Flutter | GOURSI-051b |
| #22 Docker/CI | GOURSI-002 / GOURSI-005 |
| #28 Ledger & réconciliation | Bloc G1 + GOURSI-033 |
| #20 Multi-utilisateurs & rôles | GOURSI-042 (web-admin) + Keycloak |
| #21 Journal d'audit | GOURSI-042c + audit.events |
