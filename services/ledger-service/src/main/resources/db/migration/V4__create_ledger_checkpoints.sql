-- =============================================================================
-- V4 — ledger_checkpoints : snapshots nocturnes (GOURSI-011b)
-- Écrits par CheckpointScheduler (cron 2h du matin) pour l'audit COBAC.
-- =============================================================================
CREATE TABLE ledger.ledger_checkpoints (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_date DATE         NOT NULL,
    wallet_id     UUID         NOT NULL,
    balance       NUMERIC(15,2) NOT NULL,
    frozen_balance NUMERIC(15,2) NOT NULL,
    version       BIGINT       NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_checkpoint_wallet_date UNIQUE (snapshot_date, wallet_id)
);

CREATE INDEX idx_lc_snapshot ON ledger.ledger_checkpoints (snapshot_date);

COMMENT ON TABLE ledger.ledger_checkpoints IS
    'Snapshot nightly des soldes (vérification d''intégrité COBAC).';
