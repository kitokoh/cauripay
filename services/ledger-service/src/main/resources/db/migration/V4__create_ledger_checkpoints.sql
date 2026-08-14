-- GOURSI-011b — V4 : ledger_checkpoints (snapshot nightly, contrôle COBAC)
-- Unicité (wallet_id, checkpoint_date) : idempotence si le job tourne 2× le même jour.
CREATE TABLE ledger.ledger_checkpoints (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id       UUID NOT NULL,
    balance         NUMERIC(15,2) NOT NULL CHECK (balance >= 0),
    entries_count   BIGINT NOT NULL DEFAULT 0,
    checkpoint_date DATE NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_checkpoint_wallet_day UNIQUE (wallet_id, checkpoint_date)
);

CREATE INDEX idx_lc_wallet_date ON ledger.ledger_checkpoints (wallet_id, checkpoint_date DESC);
