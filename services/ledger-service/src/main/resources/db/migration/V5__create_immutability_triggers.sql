-- V5 : triggers d'immutabilité + solde non négatif (dernière ligne de défense)
-- 1. ledger_entries est PHYSIQUEMENT immuable
CREATE OR REPLACE FUNCTION ledger.prevent_mutation()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'Opération interdite: UPDATE sur ledger_entries (id %)', OLD.id;
    ELSIF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Opération interdite: DELETE sur ledger_entries (id %)', OLD.id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_entries_immutable
    BEFORE UPDATE OR DELETE ON ledger.ledger_entries
    FOR EACH ROW EXECUTE FUNCTION ledger.prevent_mutation();

-- 2. Un solde ne peut jamais devenir négatif
CREATE OR REPLACE FUNCTION ledger.check_balance_positive()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.balance < 0 THEN
        RAISE EXCEPTION 'Solde négatif interdit pour wallet % (balance %)', NEW.wallet_id, NEW.balance;
    END IF;
    IF NEW.frozen_balance < 0 THEN
        RAISE EXCEPTION 'Frozen balance négative interdite pour wallet %', NEW.wallet_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_balances_non_negative
    BEFORE INSERT OR UPDATE ON ledger.ledger_balances
    FOR EACH ROW EXECUTE FUNCTION ledger.check_balance_positive();
