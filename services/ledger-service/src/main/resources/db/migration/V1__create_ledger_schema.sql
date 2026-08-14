-- GOURSI-011a — V1 : schéma ledger + extension UUID
-- Le schéma ledger n'est touché QUE par Flyway (Hibernate en ddl-auto=validate).
CREATE SCHEMA IF NOT EXISTS ledger;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
