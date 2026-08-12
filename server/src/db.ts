import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });

export const db = new DatabaseSync(config.dbPath);

/**
 * Helpers typés autour de node:sqlite.
 * Les lignes renvoyées par node:sqlite sont typées Record<string, SQLOutputValue>
 * — on passe par `unknown` pour retrouver nos interfaces applicatives.
 */
export function qget<T>(sql: string, ...params: unknown[]): T | undefined {
  return db.prepare(sql).get(...(params as any[])) as unknown as T | undefined;
}

export function qall<T>(sql: string, ...params: unknown[]): T[] {
  return db.prepare(sql).all(...(params as any[])) as unknown as T[];
}

export function qrun(sql: string, ...params: unknown[]): { changes: number; lastInsertRowid: number | bigint } {
  return db.prepare(sql).run(...(params as any[])) as unknown as { changes: number; lastInsertRowid: number | bigint };
}

db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS merchants (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  company       TEXT NOT NULL DEFAULT '',
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  pk_test       TEXT NOT NULL,
  sk_test       TEXT NOT NULL,
  pk_live       TEXT NOT NULL,
  sk_live       TEXT NOT NULL,
  wsec_test     TEXT NOT NULL,
  wsec_live     TEXT NOT NULL,
  live_enabled  INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id              TEXT PRIMARY KEY,
  merchant_id     TEXT NOT NULL REFERENCES merchants(id),
  amount_minor    INTEGER NOT NULL,
  currency        TEXT NOT NULL,
  methods         TEXT NOT NULL DEFAULT '[]',
  status          TEXT NOT NULL DEFAULT 'pending',
  provider        TEXT,
  provider_ref    TEXT,
  phone           TEXT,
  description     TEXT NOT NULL DEFAULT '',
  metadata        TEXT NOT NULL DEFAULT '{}',
  redirect_url    TEXT,
  idempotency_key TEXT,
  mode            TEXT NOT NULL DEFAULT 'test',
  checkout_token  TEXT NOT NULL UNIQUE,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_idem ON payments(merchant_id, idempotency_key);
CREATE INDEX IF NOT EXISTS idx_payments_merchant ON payments(merchant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS events (
  id         TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL REFERENCES payments(id),
  type       TEXT NOT NULL,
  data       TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_payment ON events(payment_id);

CREATE TABLE IF NOT EXISTS webhooks (
  id         TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL REFERENCES merchants(id),
  url        TEXT NOT NULL,
  events     TEXT NOT NULL DEFAULT '["*"]',
  mode       TEXT NOT NULL DEFAULT 'test',
  active     INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS webhook_attempts (
  id           TEXT PRIMARY KEY,
  webhook_id   TEXT NOT NULL REFERENCES webhooks(id),
  event_id     TEXT,
  event_type   TEXT NOT NULL,
  payload      TEXT NOT NULL,
  signature    TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'failed',
  http_status  INTEGER,
  attempts     INTEGER NOT NULL DEFAULT 0,
  next_retry_at TEXT,
  last_error   TEXT,
  created_at   TEXT NOT NULL,
  delivered_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_attempts_webhook ON webhook_attempts(webhook_id, created_at DESC);
`);
