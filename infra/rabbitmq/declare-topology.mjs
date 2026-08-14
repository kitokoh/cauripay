#!/usr/bin/env node
/**
 * CauriPay — Déclaration idempotente de la topologie RabbitMQ (GOURSI-RMQ1).
 *
 * Exchanges, queues, bindings et DLQ via l'API de management (PUT idempotent).
 * Usage : node infra/rabbitmq/declare-topology.mjs   (ou `make seed`)
 * Variables : RABBITMQ_HOST, RABBITMQ_PORT, RABBITMQ_USER, RABBITMQ_PASSWORD
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
function loadEnv() {
  const env = {};
  const p = resolve(root, '.env');
  if (existsSync(p)) {
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) env[m[1]] = m[2];
    }
  }
  return env;
}

const env = loadEnv();
const host = env.RABBITMQ_HOST ?? 'localhost';
const port = env.RABBITMQ_MGMT_PORT ?? '15672';
const user = env.RABBITMQ_USER ?? 'cauripay';
const pass = env.RABBITMQ_PASSWORD ?? 'cauripay_dev_password';
const vhost = '/';

const base = `http://${host}:${port}`;
const auth = Buffer.from(`${user}:${pass}`).toString('base64');
const H = { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' };
const enc = encodeURIComponent;

async function put(path, body) {
  const res = await fetch(`${base}/api/${path}`, {
    method: 'PUT',
    headers: H,
    body: JSON.stringify(body),
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`RabbitMQ PUT ${path} → ${res.status}: ${await res.text()}`);
  }
}

const log = (msg) => console.log(`  ${msg}`);

// --- Exchanges -------------------------------------------------------------
const EXCHANGES = [
  { name: 'financial.events', type: 'topic', durable: true, description: 'Événements comptables (ledger : transaction.*)' },
  { name: 'domain.events', type: 'topic', durable: true, description: 'Événements métier (api-core : user.*, kyc.*, aml.*)' },
  { name: 'dlx', type: 'direct', durable: true, description: 'Dead-letter exchange' },
];

// --- Queues (queue + sa DLQ) ----------------------------------------------
const QUEUES = [
  { name: 'q.aml.screening', bindings: [{ exchange: 'financial.events', key: 'transaction.*' }] },
  { name: 'q.notification.sms', bindings: [{ exchange: 'domain.events', key: 'user.*' }, { exchange: 'domain.events', key: 'transaction.*' }] },
  { name: 'q.notification.push', bindings: [{ exchange: 'domain.events', key: 'user.*' }, { exchange: 'domain.events', key: 'transaction.*' }] },
  { name: 'q.notification.email', bindings: [{ exchange: 'domain.events', key: 'user.*' }] },
  { name: 'q.business.webhooks', bindings: [{ exchange: 'financial.events', key: 'transaction.completed' }] },
  { name: 'q.business.reconciliation', bindings: [{ exchange: 'financial.events', key: 'transaction.*' }] },
];

console.log('\nCauriPay — topologie RabbitMQ (idempotente)\n');

for (const x of EXCHANGES) {
  await put(`exchanges/${enc(vhost)}/${enc(x.name)}`, {
    type: x.type,
    durable: x.durable,
    auto_delete: false,
    arguments: { 'x-description': x.description },
  });
  log(`exchange "${x.name}" (${x.type})`);
}

for (const q of QUEUES) {
  // Queue principale : échecs → DLX
  await put(`queues/${enc(vhost)}/${enc(q.name)}`, {
    durable: true,
    auto_delete: false,
    arguments: {
      'x-dead-letter-exchange': 'dlx',
      'x-dead-letter-routing-key': `${q.name}.dlq`,
    },
  });
  // DLQ
  await put(`queues/${enc(vhost)}/${enc(`${q.name}.dlq`)}`, { durable: true, auto_delete: false });
  // Bindings
  for (const b of q.bindings) {
    await put(
      `bindings/${enc(vhost)}/e/${enc(b.exchange)}/q/${enc(q.name)}/${enc(`${b.key}-${q.name}`)}`,
      { routing_key: b.key },
    );
  }
  // Binding DLX → DLQ
  await put(`bindings/${enc(vhost)}/e/dlx/q/${enc(`${q.name}.dlq`)}/${enc(`${q.name}.dlq`)}`, {
    routing_key: `${q.name}.dlq`,
  });
  log(`queue "${q.name}" + DLQ (${q.bindings.map((b) => `${b.exchange}:${b.key}`).join(', ')})`);
}

console.log('\n✓ Topologie RabbitMQ déclarée.');
