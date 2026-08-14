-- V4 : ledger_checkpoints — snapshot nightly par wallet (contrôle d'intégrité COBAC)
-- Unicité (wallet_id, jour) via INDEX UNIQUE fonctionnel : Postgres n'accepte pas d'expression
-- dans une contrainte UNIQUE de table, et le cast '::date' est refusé dans CREATE INDEX —
-- la forme fonctionnelle date(...) est requise.
CREATE TABLE ledger.ledger_checkpoints (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id        UUID        NOT NULL,
    balance_snapshot NUMERIC(15, 2) NOT NULL,
    entries_count    BIGINT      NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_checkpoint_wallet_day
    ON ledger.ledger_checkpoints (wallet_id, date(created_at AT TIME ZONE 'UTC'));

CREATE INDEX idx_checkpoint_wallet ON ledger.ledger_checkpoints (wallet_id, created_at DESC);
