-- =============================================================================
-- V6 — Vues d'audit (GOURSI-011c)
--   v_audit_daily_entries      : volumes par jour / direction / type
--   v_audit_balance_equilibrium : écart crédits-débits par transaction (doit être 0)
-- =============================================================================

-- Volumes journaliers (rapports COBAC / réconciliation)
CREATE OR REPLACE VIEW ledger.v_audit_daily_entries AS
SELECT created_at::date                                    AS day,
       direction,
       entry_type,
       COUNT(*)                                            AS entries_count,
       SUM(amount)                                         AS total_amount
FROM ledger.ledger_entries
GROUP BY day, direction, entry_type;

-- Équilibre comptable : chaque transaction doit avoir ΣCREDIT = ΣDEBIT.
-- SELECT * FROM v_audit_balance_equilibrium WHERE delta <> 0 → 0 ligne (DoD #4).
CREATE OR REPLACE VIEW ledger.v_audit_balance_equilibrium AS
SELECT transaction_id,
       SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE -amount END) AS delta
FROM ledger.ledger_entries
GROUP BY transaction_id;
