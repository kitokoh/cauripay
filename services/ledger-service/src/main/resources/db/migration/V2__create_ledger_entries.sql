-- =============================================================================
-- V2 — ledger_entries : écritures immuables (GOURSI-011a)
-- 4 écritures par transferAtomique : débit principal, crédit principal,
-- débit frais, crédit frais collectés.
-- =============================================================================
CREATE TABLE ledger.ledger_entries (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID         NOT NULL,
    wallet_id      UUID         NOT NULL,
    direction      VARCHAR(16)  NOT NULL CHECK (direction IN ('DEBIT', 'CREDIT')),
    amount         NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    balance_before NUMERIC(15,2) NOT NULL,
    balance_after  NUMERIC(15,2) NOT NULL,
    entry_type     VARCHAR(32)  NOT NULL CHECK (entry_type IN ('PRINCIPAL', 'FEE', 'COMMISSION', 'REVERSAL')),
    description    VARCHAR(255),
    -- Pas d'updated_at : une écriture est immuable par construction.
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_le_transaction ON ledger.ledger_entries (transaction_id);
CREATE INDEX idx_le_wallet_date ON ledger.ledger_entries (wallet_id, created_at DESC);

COMMENT ON TABLE ledger.ledger_entries IS
    'Écritures comptables immuables (triggers V5). balance_before/after = soldes après application.';
