-- GOURSI-011a — V2 : ledger_entries (écritures comptables, IMMUABLES)
-- Aucun updated_at : une écriture comptable ne se modifie jamais (liste rouge #4/#5).
CREATE TABLE ledger.ledger_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id  UUID        NOT NULL,
    wallet_id       UUID        NOT NULL,
    direction       TEXT        NOT NULL CHECK (direction IN ('DEBIT', 'CREDIT')),
    amount          NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    balance_before  NUMERIC(15,2) NOT NULL CHECK (balance_before >= 0),
    balance_after   NUMERIC(15,2) NOT NULL CHECK (balance_after >= 0),
    entry_type      TEXT        NOT NULL CHECK (entry_type IN ('PRINCIPAL', 'FEE', 'COMMISSION', 'REVERSAL')),
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_le_transaction ON ledger.ledger_entries (transaction_id);
CREATE INDEX idx_le_wallet_date ON ledger.ledger_entries (wallet_id, created_at DESC);
