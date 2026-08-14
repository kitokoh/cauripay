-- GOURSI-011a — V3 : ledger_balances (SEUL tableau que le ledger écrit)
-- version BIGINT = verrou optimiste JPA @Version (anti-corruption sous concurrence).
CREATE TABLE ledger.ledger_balances (
    wallet_id       UUID PRIMARY KEY,
    balance         NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
    frozen_balance  NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (frozen_balance >= 0),
    version         BIGINT       NOT NULL DEFAULT 0,
    last_updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
