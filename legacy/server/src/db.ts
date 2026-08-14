import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { apiKeyHash } from './secrets.js';

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

// ---------- Migrations de schéma (PRAGMA user_version) ----------

const SCHEMA_V1 = 1; // clés sk_ hachées (sk_test_hash / sk_live_hash)
const CURRENT_SCHEMA = SCHEMA_V1;

function schemaVersion(): number {
  const row = db.prepare('PRAGMA user_version').get() as { user_version: number };
  return row.user_version;
}

function hasLegacySkColumns(): boolean {
  const cols = db.prepare(`SELECT name FROM pragma_table_info('merchants') WHERE name IN ('sk_test', 'sk_live')`).all() as { name: string }[];
  return cols.length === 2;
}

/** v0 → v1 : les clés sk_ passent en stockage haché (plus jamais en clair au repos). */
function migrateV0ToV1(): void {
  if (!hasLegacySkColumns()) {
    // Base fraîche (ou schéma déjà à jour) : créer les tables et fixer la version.
    createTables();
    db.exec(`PRAGMA user_version = ${SCHEMA_V1}`);
    return;
  }
  const legacy = db.prepare('SELECT id, name, company, email, password_hash, pk_test, sk_test, pk_live, sk_live, wsec_test, wsec_live, live_enabled, created_at, updated_at FROM merchants').all() as {
    id: string; name: string; company: string; email: string; password_hash: string;
    pk_test: string; sk_test: string; pk_live: string; sk_live: string;
    wsec_test: string; wsec_live: string; live_enabled: number; created_at: string; updated_at: string;
  }[];

  db.exec(`ALTER TABLE merchants RENAME TO merchants_legacy_v0`);
  createTables();
  const insert = db.prepare(
    `INSERT INTO merchants (id, name, company, email, password_hash, pk_test, sk_test_hash, pk_live, sk_live_hash, wsec_test, wsec_live, live_enabled, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const m of legacy) {
    insert.run(m.id, m.name, m.company, m.email, m.password_hash, m.pk_test, apiKeyHash(m.sk_test), m.pk_live, apiKeyHash(m.sk_live), m.wsec_test, m.wsec_live, m.live_enabled, m.created_at, m.updated_at);
  }
  db.exec(`DROP TABLE merchants_legacy_v0`);
  db.exec(`PRAGMA user_version = ${SCHEMA_V1}`);
}

function createTables(): void {
  db.exec(`
CREATE TABLE IF NOT EXISTS merchants (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  company       TEXT NOT NULL DEFAULT '',
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  pk_test       TEXT NOT NULL,
  sk_test_hash  TEXT NOT NULL,
  pk_live       TEXT NOT NULL,
  sk_live_hash  TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS checkout_throttle (
  token        TEXT PRIMARY KEY,
  failures     INTEGER NOT NULL DEFAULT 0,
  blocked_until TEXT,
  updated_at   TEXT NOT NULL
);
`);
}

db.exec(`PRAGMA journal_mode = WAL;`);
db.exec(`PRAGMA foreign_keys = ON;`);

if (schemaVersion() < CURRENT_SCHEMA) {
  migrateV0ToV1();
} else {
  createTables();
}
