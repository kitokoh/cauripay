# Définition of Done — CauriPay

Version : 2.0 (2026-08-14) — source : `docs/REVUE-CONSTITUTION.md` §8.5

| # | Critère | Méthode de vérification |
|---|---|---|
| 1 | transferAtomic = 4 entries · trigger immutabilité actif · équilibre comptable 0 écart | tests ledger + audit SQL (GOURSI-QA2) |
| 2 | Test 10 threads vert (aucun double débit) | LedgerWriteServiceConcurrencyTest |
| 3 | Tests 200/401/422 (contrat HTTP ledger) | LedgerControllerIntegrationTest |
| 4 | KYC approve → kycLevel à jour ; alerte AML → wallet FROZEN | tests E2E kyc/aml |
| 5 | USSD : 4 opérations complètes | simulateur USSD |
| 6 | Inscription KYC < 3 min | test de parcours |
| 7 | 1000 transactions/min sans dégradation (p95 < 2 s, erreur < 0,1 %) | k6 (GOURSI-QA1) |
| 8 | Simulation bout en bout : register → login → transfer P2P → webhook/reçu | test E2E |
| 9 | gitleaks 0 finding · Trivy : aucune image CRITICAL/HIGH | security-scan CI |
| 10 | 0 vulnérabilité critique (CVSS > 9) au pentest automatisé | OWASP ZAP (GOURSI-QA3) |

État : ⬜ en cours · ✅ validé · ❌ échoué — suivi dans l'issue GOURSI-QA4.
