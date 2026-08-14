-- V6 : vues d'audit (lecture seule) pour api-core et reconciliation-service
CREATE SCHEMA IF NOT EXISTS audit;

CREATE OR REPLACE VIEW audit.ledger_entries_view AS
SELECT id, transaction_id, wallet_id, direction, amount, balance_before, balance_after, entry_type, description, created_at
FROM ledger.ledger_entries;

CREATE OR REPLACE VIEW audit.balance_view AS
SELECT wallet_id, balance, frozen_balance, (balance - frozen_balance) AS available_balance, version, last_updated_at
FROM ledger.ledger_balances;

-- Vue d'équilibre comptable journalier (spec §8.4) : SUM(CREDIT) - SUM(DEBIT) = 0
CREATE OR REPLACE VIEW audit.daily_balance AS
SELECT
    (created_at AT TIME ZONE 'UTC')::date AS day,
    SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE 0 END) AS total_credit,
    SUM(CASE WHEN direction = 'DEBIT'  THEN amount ELSE 0 END) AS total_debit,
    SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE -amount END) AS delta
FROM ledger.ledger_entries
GROUP BY (created_at AT TIME ZONE 'UTC')::date;

REVOKE ALL ON audit.ledger_entries_view, audit.balance_view, audit.daily_balance FROM PUBLIC;

-- Accorder SELECT au rôle courant (indépendant du nom d'utilisateur de la base)
DO $
BEGIN
  EXECUTE format(
    'GRANT SELECT ON audit.ledger_entries_view, audit.balance_view, audit.daily_balance TO %I',
    current_user
  );
END $;
