-- GOURSI-011c · V5 — intégrité en base : immutabilité des écritures + solde jamais négatif

-- 1. ledger_entries est PHYSIQUEMENT immuable
CREATE OR REPLACE FUNCTION ledger.prevent_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Opération interdite : ledger_entries est immuable (UPDATE/DELETE refusés)';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_entries_immutable ON ledger.ledger_entries;
CREATE TRIGGER trg_entries_immutable
    BEFORE UPDATE OR DELETE ON ledger.ledger_entries
    FOR EACH ROW EXECUTE FUNCTION ledger.prevent_mutation();

-- 2. un solde ne peut jamais devenir négatif
CREATE OR REPLACE FUNCTION ledger.check_balance_positive()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.balance < 0 THEN
        RAISE EXCEPTION 'Solde négatif interdit (wallet %)', NEW.wallet_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_balances_non_negative ON ledger.ledger_balances;
CREATE TRIGGER trg_balances_non_negative
    BEFORE INSERT OR UPDATE ON ledger.ledger_balances
    FOR EACH ROW EXECUTE FUNCTION ledger.check_balance_positive();
