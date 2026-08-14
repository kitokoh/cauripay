-- GOURSI-011c — V5 : dernière ligne de défense en base
-- 1) ledger_entries physiquement immuable (UPDATE/DELETE → EXCEPTION)
-- 2) ledger_balances jamais négatif
CREATE OR REPLACE FUNCTION ledger.prevent_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Opération interdite: UPDATE ou DELETE sur ledger_entries (écriture comptable immuable)';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ledger_entries_immutable
    BEFORE UPDATE OR DELETE ON ledger.ledger_entries
    FOR EACH ROW EXECUTE FUNCTION ledger.prevent_mutation();

CREATE OR REPLACE FUNCTION ledger.check_balance_positive()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.balance < 0 THEN
        RAISE EXCEPTION 'Solde négatif interdit pour wallet %', NEW.wallet_id;
    END IF;
    IF NEW.frozen_balance < 0 THEN
        RAISE EXCEPTION 'Solde gelé négatif interdit pour wallet %', NEW.wallet_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ledger_balances_non_negative
    BEFORE INSERT OR UPDATE ON ledger.ledger_balances
    FOR EACH ROW EXECUTE FUNCTION ledger.check_balance_positive();
