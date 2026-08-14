<<<<<<< HEAD
-- GOURSI-011a — V1 : schéma ledger + extension UUID
-- Le schéma ledger n'est touché QUE par Flyway (Hibernate en ddl-auto=validate).
=======
-- V1 : schéma ledger + extension uuid
>>>>>>> d17144a (feat(GOURSI-010..016): ledger-service Spring Boot 3.2 — grand livre comptable (G1))
CREATE SCHEMA IF NOT EXISTS ledger;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
