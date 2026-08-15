#!/usr/bin/env node
/**
 * Validation de configuration (GOURSI-001b).
 *
 * Vérifie que toutes les variables documentées dans .env.example sont résolues :
 *   1. valeur définie dans l'environnement (process.env), OU
 *   2. valeur définie dans .env (chargé s'il existe), OU
 *   3. valeur par défaut documentée dans .env.example.
 *
 * Sortie : rapport groupé par section + code de sortie 0/1.
 * Usage : node scripts/validate-env.mjs  (ou `make validate-env`)
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const examplePath = resolve(root, '.env.example');
const envPath = resolve(root, '.env');

/** Parse un fichier KEY=VALUE (supporte les commentaires #). */
function parseDotenv(file) {
  const out = {};
  for (const rawLine of readFileSync(file, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const idx = line.indexOf('=');
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    if (key) out[key] = value;
  }
  return out;
}

if (!existsSync(examplePath)) {
  console.error('✖ .env.example introuvable — exécutez depuis la racine du monorepo.');
  process.exit(1);
}

const example = parseDotenv(examplePath);
const local = existsSync(envPath) ? parseDotenv(envPath) : {};
const keys = Object.keys(example);

const missing = [];
for (const key of keys) {
  const resolved = process.env[key] ?? local[key] ?? example[key];
  if (resolved === undefined || resolved === '') missing.push(key);
}

// Groupement par section pour un rapport lisible
const sections = {};
for (const key of keys) {
  const section = key.startsWith('LEDGER')
    ? 'ledger-service'
    : key.startsWith('KEYCLOAK')
      ? 'keycloak'
      : key.startsWith('POSTGRES')
        ? 'postgres'
        : key.startsWith('REDIS')
          ? 'redis'
          : key.startsWith('RABBITMQ')
            ? 'rabbitmq'
            : 'api-core';
  (sections[section] ??= []).push(key);
}

console.log(`\nCauriPay — validation d'environnement (${keys.length} variables documentées)\n`);
for (const [section, vars] of Object.entries(sections)) {
  const bad = vars.filter((v) => missing.includes(v));
  const ok = vars.length - bad.length;
  const flag = bad.length === 0 ? '✓' : '✖';
  console.log(`  ${flag} ${section.padEnd(14)} ${ok}/${vars.length}`);
  for (const v of bad) console.log(`      manquante : ${v}`);
}

if (missing.length > 0) {
  console.error(`\n✖ ${missing.length} variable(s) manquante(s) — démarrage refusé (fail-fast).\n`);
  process.exit(1);
}
console.log('\n✓ Configuration valide.\n');
