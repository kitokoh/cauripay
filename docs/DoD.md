# DoD MVP — Checklist de la Définition of Done (10 critères)

> Source : `docs/DESIGN-v2.md` §8 (spec §8.5) · Suivi : issue **GOURSI-QA4** (#264)
> Mise à jour : 2026-08-14 — G0 ✅ · G1 ✅ · G2 ✅ (31/39) · G3 en cours · G4 à venir · G5 ✅ · G6 ✅

| # | Critère | Preuve | Statut |
|---|---|---|---|
| 1 | Un transfer P2P crée **exactement 4 écritures ledger** | `LedgerWriteServiceIT#transferAtomic_creates_exactly_4_entries` | ✅ G1 (#295) |
| 2 | `@Version` : 10 threads simultanés → aucun solde corrompu | `LedgerWriteServiceIT` (10 threads, SERIALIZABLE + @Version) | ✅ G1 (#295) |
| 3 | Trigger d'immutabilité : `UPDATE ledger_entries` → « Opération interdite » | `MigrationIntegrityTest` + `scripts/audit/check_immutability.sql` | ✅ G1 (#295) + audit CI (#297, #315) |
| 4 | Équilibre comptable : `SUM(CREDIT)-SUM(DEBIT)` = 0 (0 écart) | `scripts/audit/check_balance.sql` + job CI `audit-sql` | ✅ audit CI (#297, #315) |
| 5 | P2P de bout en bout < 10 s | E2E api-core (GOURSI-023i) — vérifié avec api-core mergé (#300) | ✅ G2 |
| 6 | Inscription + KYC < 3 min | kyc-service mergé (#318) — parcours à mesurer en staging | ⬜ mesure staging |
| 7 | **1000 tx/min** (k6, p95 < 2 s, erreur < 0,1 %) | `tests/load/p2p-1000tpm.js` — exécution staging requise | ⬜ exécution staging |
| 8 | USSD : **4 opérations** fonctionnelles sur simulateur | ussd-service mergé (#339) — simulateur + tests | ✅ G2 (#339) |
| 9 | **gitleaks 0** finding | security-scan CI (job Gitleaks) — vert sur chaque PR | ✅ CI |
| 10 | **ZAP 0** vulnérabilité critique résiduelle | `tests/security/zap-baseline` — exécution staging requise | ⬜ exécution staging |

Légende : ⬜ en cours · ✅ validé (avec preuve exécutable) · ❌ échoué.

**Critères 6, 7, 10** : preuves exécutables en environnement staging (nécessitent un déploiement
staging complet) — voir GOURSI-QA1 (k6), GOURSI-QA3 (ZAP) et docs/DEPLOYMENT.md.
