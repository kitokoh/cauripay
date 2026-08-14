-- =============================================================================
-- V1 — Schéma `ledger` + extension uuid (GOURSI-011a)
-- =============================================================================
CREATE SCHEMA IF NOT EXISTS ledger;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Le schéma est la frontière de confiance : tout accès aux tables ledger passe
-- par ledger-service (aucun service ne touche ces tables directement).
COMMENT ON SCHEMA ledger IS 'CauriPay — grand livre comptable. Accès exclusif via ledger-service (X-Service-Key).';
