-- =============================================================================
-- V3 — ledger_balances : soldes avec verrou optimiste (GOURSI-011a)
-- Seul ledger-service écrit ces soldes (règle absolue n°1).
-- =============================================================================
CREATE TABLE ledger.ledger_balances (
    wallet_id       UUID PRIMARY KEY,
    balance         NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
    frozen_balance  NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (frozen_balance >= 0),
    -- Verrou optimiste (@Version) : toute mise à jour incrémente version et
    -- échoue si la ligne a changé entre lecture et écriture (DoD #2).
    version         BIGINT        NOT NULL DEFAULT 0,
    last_updated_at TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Le trigger solde non négatif (V5) complète les CHECK en profondeur.
COMMENT ON TABLE ledger.ledger_balances IS
    'Soldes par wallet. Ne jamais mettre à jour hors ledger-service.';
