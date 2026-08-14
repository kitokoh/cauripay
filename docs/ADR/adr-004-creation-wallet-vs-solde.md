# ADR-004 — Création de wallet vs mutation de solde : la frontière

- **Statut** : Adoptée · **Date** : 2026-08-14 · **Décideur** : kitokoh
- **Contexte** : qui crée le wallet, qui écrit le solde ?
- **Décision** : api-core crée le wallet (identité, solde 0) ; toute mutation de solde passe par
  ledger-service. `wallets.balance` Prisma = consultation uniquement.
- **Conséquences** : cohérence avec la règle absolue n°1.
