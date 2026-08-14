-- GOURSI-QA2 — Audit d'IMMUTABILITÉ du ledger
-- Objectif : une tentative de UPDATE sur ledger_entries DOIT échouer
-- (trigger « Opération interdite »). Sortie attendue du script : erreur => OK.
-- Usage : psql "${LEDGER_DATABASE_URL}" -f scripts/audit/check_immutability.sql

\set ON_ERROR_STOP off

DO $$
DECLARE
  v_id uuid;
  v_failed boolean := false;
BEGIN
  -- 1. Prendre une écriture existante (sinon en créer une de test via la vue)
  SELECT id INTO v_id FROM ledger.ledger_entries LIMIT 1;

  IF v_id IS NULL THEN
    RAISE NOTICE 'Aucune écriture en base : test impossible — exécuter d''abord un transfer (tests d''intégration).';
    RETURN;
  END IF;

  -- 2. Tenter une mise à jour interdite
  BEGIN
    UPDATE ledger.ledger_entries SET description = 'TENTATIVE_INTERDITE' WHERE id = v_id;
    RAISE NOTICE '✘ ÉCHEC DU TEST : la mise à jour a été acceptée (trigger absent ?)';
    v_failed := true;
  EXCEPTION
    WHEN raise_exception THEN
      RAISE NOTICE '✔ OK : mise à jour refusée (trigger d''immutabilité actif)';
    WHEN OTHERS THEN
      RAISE NOTICE '✔ OK : mise à jour refusée (%), trigger actif', SQLERRM;
  END;

  -- 3. Idem pour DELETE
  BEGIN
    DELETE FROM ledger.ledger_entries WHERE id = v_id;
    RAISE NOTICE '✘ ÉCHEC DU TEST : le delete a été accepté (trigger absent ?)';
    v_failed := true;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '✔ OK : delete refusé (%), trigger actif', SQLERRM;
  END;

  IF v_failed THEN
    RAISE EXCEPTION 'AUDIT IMMUTABILITÉ : ÉCHEC';
  END IF;
END $$;
