-- GOURSI-011c · V6 — vues d'audit (lecture seule, pour api-core et la conformité COBAC)

CREATE SCHEMA IF NOT EXISTS audit;

-- Vue des écritures (insert-only, aucune écriture possible via la vue)
CREATE OR REPLACE VIEW audit.ledger_entries_view AS
SELECT id, transaction_id, wallet_id, direction, amount,
       balance_before, balance_after, entry_type, description, created_at
FROM ledger.ledger_entries;

CREATE OR REPLACE VIEW audit.balance_view AS
SELECT wallet_id, balance, frozen_balance,
       (balance - frozen_balance) AS available_balance, version, last_updated_at
FROM ledger.ledger_balances;
