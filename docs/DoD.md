# DoD MVP — Checklist de la Définition of Done (10 critères)

> Source : `docs/DESIGN-v2.md` §8 (spec §8.5) · Suivi : issue **GOURSI-QA4** (#264)
> Mise à jour : 2026-08-14 — statut : ⬜ en cours (Phase 0)

| # | Critère | Preuve attendue | Statut |
|---|---|---|---|
| 1 | Un transfer P2P crée **exactement 4 écritures ledger** | test `transferAtomic_creates_exactly_4_entries` | ⬜ |
| 2 | `@Version` : 10 threads simultanés → aucun solde corrompu | `LedgerWriteServiceConcurrencyTest` | ⬜ |
| 3 | Trigger d'immutabilité : `UPDATE ledger_entries` → « Opération interdite » | `MigrationIntegrityTest` | ⬜ |
| 4 | Équilibre comptable : `SUM(CREDIT)-SUM(DEBIT)` = 0 (0 écart) | script d'audit SQL (GOURSI-QA2) | ⬜ |
| 5 | P2P de bout en bout < 10 s | test E2E + mesure | ⬜ |
| 6 | Inscription + KYC < 3 min | test de parcours | ⬜ |
| 7 | **1000 tx/min** (k6, p95 < 2 s, erreur < 0,1 %) | `tests/load/p2p-1000tpm.js` (GOURSI-QA1) | ⬜ |
| 8 | USSD : **4 opérations** fonctionnelles sur simulateur | simulateur + tests (GOURSI-027d) | ⬜ |
| 9 | **gitleaks 0** finding | security-scan CI (GOURSI-005b) | ⬜ |
| 10 | **ZAP 0** vulnérabilité critique résiduelle | `tests/security/zap-baseline` (GOURSI-QA3) | ⬜ |

Légende : ⬜ en cours · ✅ validé · ❌ échoué (avec lien vers la preuve d'échec).
