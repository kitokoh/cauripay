# CauriPay — Définition de Done MVP (GOURSI-QA4)

> Checklist des 10 critères de la spec §8.5, transformés en preuves vérifiables.
> Règle : **aucun critère « coché » sans preuve exécutable** (test, rapport, commande).
> Chaque critère référence sa preuve. Mise à jour : 2026-08-14.

| # | Critère (spec §8.5) | Bloc | Preuve attendue | Statut |
|---|---|---|---|---|
| 1 | `transferAtomic` = **4 écritures ledger** (débit émetteur, crédit bénéficiaire, 2 frais) | G1 | Test `LedgerWriteServiceTest.transferAtomic_createsFourEntries` | ⬜ à prouver |
| 2 | **Concurrence** : `@Version` (optimistic lock) — 10 threads simultanés, pas de corruption de solde | G1 | Test `ConcurrencyTest.tenThreads_noCorruption` (GOURSI-014f) | ⬜ à prouver |
| 3 | **Trigger d'immutabilité** actif en base (UPDATE/DELETE sur `ledger_entries` refusés) | G1 | Test d'acceptation migrations (GOURSI-011d) + `psql` probe | ⬜ à prouver |
| 4 | **Équilibre comptable** : somme des écritures = balances, 0 écart | G1 | Script d'audit SQL (GOURSI-QA2) → `0 rows` | ⬜ à prouver |
| 5 | **P2P bout en bout < 10 s** (register → login → transfer) | G2 | Test E2E chronométré (GOURSI-023i) | ⬜ à prouver |
| 6 | **KYC < 3 min** (submit → validate) | G2 | Test de flux + mesure (GOURSI-024c) | ⬜ à prouver |
| 7 | **1000 tx/min** (p95 < 2 s, erreur < 0,1 %) | G6 | Rapport k6 (GOURSI-QA1) | ⬜ à prouver |
| 8 | **USSD : 4 opérations fonctionnelles** (solde, envoi, facture, retrait) | G2 | Tests simulateur USSD (GOURSI-027d) | ⬜ à prouver |
| 9 | **Gitleaks : 0 fuite** | G0/G6 | Rapport CI `security.yml` (gitleaks) | ✅ CI en place (scan continu) |
| 10 | **ZAP : 0 critique** sur api-core | G6 | Rapport OWASP ZAP baseline (GOURSI-QA3) | ⬜ à prouver |

## Preuves déjà en place (G0)

- **CI de sécurité** (`gitleaks` + `trivy`) : workflow `security.yml` — couvre le critère 9 en continu.
- **CI qualité** (`lint TS + tsc + jest + mvn verify`) : workflow `ci.yml`.
- **Vérification d'environnement** : `make validate-env`.

## Procédure de validation

1. Chaque critère est prouvé par le bloc qui le porte (colonne « Bloc »).
2. La preuve est référencée ici (lien test/rapport/commande) au moment où le bloc est clos.
3. Validation finale : 10/10 cochés avec preuves, signée par le propriétaire (commentaire sur #264).
