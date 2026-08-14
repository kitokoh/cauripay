-- V6 : vues d'audit en lecture pour api-core (schéma audit, insert-only par convention)

CREATE SCHEMA IF NOT EXISTS audit;

CREATE OR REPLACE VIEW audit.ledger_entries_view AS
SELECT id, transaction_id, wallet_id, direction, amount,
       balance_before, balance_after, entry_type, description, created_at
FROM ledger.ledger_entries;

CREATE OR REPLACE VIEW audit.balance_view AS
SELECT wallet_id, balance, frozen_balance, version, last_updated_at
FROM ledger.ledger_balances;
