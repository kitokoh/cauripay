# Décisions d'architecture (ADR)

Les ADR documentent les **décisions structurantes** du projet. Une ADR se lit comme
un article de blog technique : contexte → décision → conséquences.

| # | Décision | Statut |
|---|---|---|
| [ADR-001](ADR-001.md) | kyc-service et aml-service sont des services dédiés | ✅ Accepté |
| [ADR-002](ADR-002.md) | Le cœur produit est la plateforme wallet GOURSI ; le v0.1 (agrégateur) sort du périmètre actif (`legacy/`) | ✅ Accepté |
| [ADR-003](ADR-003.md) | Le wallet est créé à l'inscription (niveau BASIC) | ✅ Accepté |
| [ADR-004](ADR-004.md) | Convention de ports & nommage des services | ✅ Accepté |
| [ADR-005](ADR-005-sort-ancien-backlog.md) | Sort de l'ancien backlog (issues #1–#137) : supersédées par la spec GOURSI | ✅ Accepté |
| [ADR-006](ADR-006-frontiere-wallet.md) | Frontière wallet : api-core crée le wallet, seul le ledger écrit les soldes | ✅ Accepté |
| [ADR-007](ADR-007-evenements-ledger-api-core.md) | Événement `transaction.completed` publié par ledger ET api-core (déduplication par transactionId) | ✅ Accepté |

Règles : toute nouvelle décision structurante → nouvelle ADR (numéro suivant) ;
une ADR n'est modifiée que par amendement daté, jamais réécrite en silence.
