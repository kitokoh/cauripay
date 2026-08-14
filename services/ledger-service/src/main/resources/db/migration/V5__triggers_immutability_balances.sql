-- =============================================================================
-- V5 — Triggers : immutabilité des écritures + solde non négatif (GOURSI-011c)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Immutabilité : toute écriture comptable est définitive.
--    UPDATE / DELETE sur ledger_entries → exception (DoD #3).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ledger.fn_prevent_entry_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Opération interdite : les écritures ledger sont immuables (transaction %)',
        OLD.transaction_id;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_entries_immutable
    BEFORE UPDATE OR DELETE ON ledger.ledger_entries
    FOR EACH ROW
    EXECUTE FUNCTION ledger.fn_prevent_entry_mutation();

-- ---------------------------------------------------------------------------
-- 2. Solde non négatif en profondeur (défense en profondeur du CHECK V3).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ledger.fn_check_balance_non_negative()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.balance < 0 OR NEW.frozen_balance < 0 THEN
        RAISE EXCEPTION 'Solde négatif interdit (wallet %)', NEW.wallet_id;
    END IF;
    NEW.last_updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_balances_non_negative
    BEFORE INSERT OR UPDATE ON ledger.ledger_balances
    FOR EACH ROW
    EXECUTE FUNCTION ledger.fn_check_balance_non_negative();
