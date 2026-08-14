-- V4 : ledger_checkpoints — snapshot nightly pour contrôle COBAC
CREATE TABLE ledger.ledger_checkpoints (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id        UUID NOT NULL,
    balance_snapshot NUMERIC(15,2) NOT NULL,
    entries_count    BIGINT NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Un seul checkpoint par wallet et par jour
CREATE UNIQUE INDEX idx_checkpoint_wallet_day
    ON ledger.ledger_checkpoints (wallet_id, (created_at::date));
