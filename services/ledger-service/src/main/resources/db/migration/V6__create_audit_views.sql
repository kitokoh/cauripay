-- GOURSI-011c — V6 : vues d'audit (lecture seule pour api-core / réconciliation)
CREATE SCHEMA IF NOT EXISTS audit;

CREATE VIEW audit.ledger_entries_view AS
SELECT id, transaction_id, wallet_id, direction, amount,
       balance_before, balance_after, entry_type, description, created_at
FROM ledger.ledger_entries;

CREATE VIEW audit.balance_view AS
SELECT wallet_id, balance, frozen_balance, version, last_updated_at
FROM ledger.ledger_balances;

-- Équilibre comptable par wallet et par jour : SUM(CREDIT) - SUM(DEBIT)
CREATE VIEW audit.daily_balance_view AS
SELECT wallet_id,
       created_at::date AS day,
       SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE -amount END) AS net_movement
FROM ledger.ledger_entries
GROUP BY wallet_id, created_at::date;
