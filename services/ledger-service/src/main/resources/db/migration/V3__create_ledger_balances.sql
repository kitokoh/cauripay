<<<<<<< HEAD
-- GOURSI-011a — V3 : ledger_balances (SEUL tableau que le ledger écrit)
-- version BIGINT = verrou optimiste JPA @Version (anti-corruption sous concurrence).
CREATE TABLE ledger.ledger_balances (
    wallet_id       UUID PRIMARY KEY,
    balance         NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
    frozen_balance  NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (frozen_balance >= 0),
    version         BIGINT       NOT NULL DEFAULT 0,
    last_updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
=======
-- V3 : ledger_balances — solde courant par wallet (@Version pour l'optimistic lock)
CREATE TABLE ledger.ledger_balances (
    wallet_id       UUID PRIMARY KEY,
    balance         NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
    frozen_balance  NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (frozen_balance >= 0),
    version         BIGINT         NOT NULL DEFAULT 0,
    last_updated_at TIMESTAMPTZ    NOT NULL DEFAULT now()
>>>>>>> d17144a (feat(GOURSI-010..016): ledger-service Spring Boot 3.2 — grand livre comptable (G1))
);
