#!/usr/bin/env node
/**
 * CauriPay — Seed idempotent du realm Keycloak (GOURSI-KC1).
 *
 * Crée (si absents) : le realm `goursi`, le client `api-core` (clés RS256 par
 * défaut du realm), les clients fronts, et les rôles de la plateforme.
 * Ré-exécutable à volonté : chaque appel est un GET puis un POST conditionnel.
 *
 * Usage : node infra/keycloak/seed-realm.mjs   (ou `make seed`)
 * Variables : KEYCLOAK_HOST, KEYCLOAK_PORT, KEYCLOAK_ADMIN_USER, KEYCLOAK_ADMIN_PASSWORD,
 *             KEYCLOAK_REALM (défaut goursi)
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
const host = env.KEYCLOAK_HOST ?? 'localhost';
const port = env.KEYCLOAK_PORT ?? '8080';
const adminUser = env.KEYCLOAK_ADMIN_USER ?? 'admin';
const adminPass = env.KEYCLOAK_ADMIN_PASSWORD ?? 'admin';
const realm = env.KEYCLOAK_REALM ?? 'goursi';

const base = `http://${host}:${port}`;
const auth = Buffer.from(`${adminUser}:${adminPass}`).toString('base64');
const H = { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' };

async function api(path, opts = {}) {
  const res = await fetch(`${base}${path}`, { ...opts, headers: { ...H, ...(opts.headers ?? {}) } });
  if (!res.ok && res.status !== 409) {
    throw new Error(`Keycloak API ${opts.method ?? 'GET'} ${path} → ${res.status}: ${await res.text()}`);
  }
  return res.status === 204 ? null : res.json().catch(() => null);
}

const ROLES = [
  'customer', // utilisateur mobile
  'agent', // agent de distribution (cash-in / cash-out)
  'merchant', // marchand (business-service)
  'support_l1', // support niveau 1
  'support_l2', // support niveau 2 — autorise /transactions/:id/reverse
  'compliance_officer', // file KYC / alertes AML
  'admin', // web-admin
];

const CLIENTS = [
  { clientId: 'api-core', publicClient: false, serviceAccountsEnabled: true, description: 'Client backend api-core (auth machine + déléguée)' },
  { clientId: 'web-admin', publicClient: true, redirectUris: ['http://localhost:4200/*'], description: 'Console d’administration' },
  { clientId: 'web-business', publicClient: true, redirectUris: ['http://localhost:4300/*'], description: 'Dashboard marchand' },
  { clientId: 'mobile-customer', publicClient: true, redirectUris: ['cauripay://callback'], description: 'App mobile client' },
  { clientId: 'mobile-agent', publicClient: true, redirectUris: ['cauripay-agent://callback'], description: 'App mobile agent' },
];

const log = (msg) => console.log(`  ${msg}`);

// 1. Realm
let realmCreated = false;
try {
  await api(`/admin/realms/${realm}`);
  log(`realm "${realm}" existe déjà`);
} catch {
  await api('/admin/realms', {
    method: 'POST',
    body: JSON.stringify({
      realm,
      enabled: true,
      displayName: 'CauriPay',
      // Clés RS256 par défaut (Keycloak génère la paire à la création du realm)
      sslRequired: 'external',
      registrationAllowed: false,
    }),
  });
  realmCreated = true;
  log(`realm "${realm}" créé`);
}

// 2. Rôles
const realmRoles = await api(`/admin/realms/${realm}/roles`);
const existing = new Set((realmRoles ?? []).map((r) => r.name));
for (const role of ROLES) {
  if (existing.has(role)) continue;
  await api(`/admin/realms/${realm}/roles`, { method: 'POST', body: JSON.stringify({ name: role }) });
  log(`rôle "${role}" créé`);
}

// 3. Clients
const clients = await api(`/admin/realms/${realm}/clients`);
const existingClients = new Set((clients ?? []).map((c) => c.clientId));
for (const c of CLIENTS) {
  if (existingClients.has(c.clientId)) {
    log(`client "${c.clientId}" existe déjà`);
    continue;
  }
  await api(`/admin/realms/${realm}/clients`, {
    method: 'POST',
    body: JSON.stringify({
      clientId: c.clientId,
      publicClient: c.publicClient,
      serviceAccountsEnabled: c.serviceAccountsEnabled ?? false,
      standardFlowEnabled: true,
      directAccessGrantsEnabled: true,
      redirectUris: c.redirectUris ?? [],
      description: c.description,
    }),
  });
  log(`client "${c.clientId}" créé`);
}

console.log(`\n✓ Seed Keycloak terminé (realm "${realm}"${realmCreated ? ', créé' : ', existant'}).`);
console.log(`  Console admin : http://${host}:${port}/admin · JWKS : ${base}/realms/${realm}/protocol/openid-connect/certs`);
