# DoD MVP — Checklist de la Définition of Done (10 critères)

> Source : `docs/DESIGN-v2.md` §8 (spec §8.5) · Suivi : issue **GOURSI-QA4** (#264)
> Mise à jour : 2026-08-14 — Phase 1 (G0 ✅ · G1 ✅ · G2 en cours · G3-G5 à venir · G6 en cours)

| # | Critère | Preuve | Statut |
|---|---|---|---|
| 1 | Un transfer P2P crée **exactement 4 écritures ledger** | `LedgerWriteServiceTest#transferAtomic_creates_exactly_4_entries` (services/ledger-service) | ✅ G1 mergé (#295) |
| 2 | `@Version` : 10 threads simultanés → aucun solde corrompu | `LedgerWriteServiceConcurrencyTest` (10 threads, SERIALIZABLE + @Version) | ✅ G1 mergé (#295) |
| 3 | Trigger d'immutabilité : `UPDATE ledger_entries` → « Opération interdite » | `MigrationIntegrityTest` + `scripts/audit/check_immutability.sql` | ✅ G1 mergé (#295) + audit CI (GOURSI-QA2) |
| 4 | Équilibre comptable : `SUM(CREDIT)-SUM(DEBIT)` = 0 (0 écart) | `scripts/audit/check_balance.sql` + job CI `audit-sql` | ✅ audit CI (GOURSI-QA2) |
| 5 | P2P de bout en bout < 10 s | test E2E api-core (GOURSI-023i) — **à prouver quand G2 mergé** | ⬜ bloqué G2 |
| 6 | Inscription + KYC < 3 min | test de parcours kyc-service (GOURSI-024) | ⬜ bloqué G2 |
| 7 | **1000 tx/min** (k6, p95 < 2 s, erreur < 0,1 %) | `tests/load/p2p-1000tpm.js` (GOURSI-QA1) — exécution sur staging quand G2 mergé | ⬜ script prêt, exécution bloquée G2 |
| 8 | USSD : **4 opérations** fonctionnelles sur simulateur | simulateur + tests (GOURSI-027d) | ⬜ bloqué G2 |
| 9 | **gitleaks 0** finding | security-scan CI (job Gitleaks) — vérifié sur chaque PR | ✅ CI active |
| 10 | **ZAP 0** vulnérabilité critique résiduelle | `tests/security/zap-baseline` (GOURSI-QA3) — exécution sur staging | ⬜ config prête, exécution bloquée G2 |

Légende : ⬜ en cours · ✅ validé (avec preuve exécutable) · ❌ échoué.

**Critères 5-8, 10** : les preuves dépendent de l'api-core (G2, PR #294/#296) et des apps —
statut passé à ✅ dans la même PR qui apporte la preuve. Aucun critère n'est coché sans preuve.
