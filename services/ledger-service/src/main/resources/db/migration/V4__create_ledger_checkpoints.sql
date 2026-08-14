-- GOURSI-011b · V4 — ledger_checkpoints (snapshot nightly COBAC)
-- Unicité (wallet_id, jour) : 1 checkpoint par wallet et par jour.
CREATE TABLE ledger.ledger_checkpoints (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id        UUID NOT NULL,
    checkpoint_date  DATE NOT NULL,
    balance_snapshot NUMERIC(15,2) NOT NULL CHECK (balance_snapshot >= 0),
    entries_count    BIGINT NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_checkpoint_wallet_day UNIQUE (wallet_id, checkpoint_date)
);

CREATE INDEX idx_checkpoints_wallet ON ledger.ledger_checkpoints (wallet_id, created_at DESC);
