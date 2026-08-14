-- V2 : ledger_entries — journal des écritures (immuable)
CREATE TABLE ledger.ledger_entries (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID        NOT NULL,
    wallet_id      UUID        NOT NULL,
    direction      TEXT        NOT NULL CHECK (direction IN ('DEBIT', 'CREDIT')),
    amount         NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    balance_before NUMERIC(15,2) NOT NULL,
    balance_after  NUMERIC(15,2) NOT NULL,
    entry_type     TEXT        NOT NULL CHECK (entry_type IN ('PRINCIPAL', 'FEE', 'COMMISSION', 'REVERSAL')),
    description    TEXT        NOT NULL DEFAULT '',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PAS de updated_at : le journal est immuable (trigger V5)

CREATE INDEX idx_le_transaction ON ledger.ledger_entries (transaction_id);
CREATE INDEX idx_le_wallet_date ON ledger.ledger_entries (wallet_id, created_at DESC);
