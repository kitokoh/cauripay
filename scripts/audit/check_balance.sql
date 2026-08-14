-- GOURSI-QA2 — Audit d'ÉQUILIBRE COMPTABLE du ledger
-- Règle (spec §8.4) : pour chaque journée, SUM(CREDIT) - SUM(DEBIT) = 0.
-- Sortie attendue : ZÉRO ligne retournée. Toute ligne = écart → incident COBAC.
-- Usage : psql "${LEDGER_DATABASE_URL}" -f scripts/audit/check_balance.sql

\set ON_ERROR_STOP on

WITH daily_balance AS (
  SELECT
    (created_at AT TIME ZONE 'UTC')::date AS day,
    SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE 0 END)  AS total_credit,
    SUM(CASE WHEN direction = 'DEBIT'  THEN amount ELSE 0 END)  AS total_debit,
    SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE -amount END) AS delta
  FROM ledger.ledger_entries
  GROUP BY (created_at AT TIME ZONE 'UTC')::date
)
SELECT
  day,
  total_credit,
  total_debit,
  delta
FROM daily_balance
WHERE ABS(delta) > 0.01
ORDER BY day;

-- Résultat : 0 ligne => équilibre comptable parfait.
-- (Une ligne affichée = écart >= 0,01 unité mineure → à investiguer immédiatement.)
