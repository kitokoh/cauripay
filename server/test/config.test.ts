import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.join(here, '..');

function loadConfigInChild(env: Record<string, string>): { status: number | null; stderr: string } {
  const res = spawnSync(process.execPath, ['--import', 'tsx/esm', '-e', "await import('./src/config.ts')"], {
    cwd: serverDir,
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
  return { status: res.status, stderr: res.stderr };
}

test('config : en production sans JWT_SECRET → refus de démarrer (fail-fast, #42)', () => {
  const r = loadConfigInChild({ NODE_ENV: 'production', JWT_SECRET: '' });
  assert.notEqual(r.status, 0, 'le process doit échouer');
  assert.match(r.stderr, /JWT_SECRET/);
  assert.match(r.stderr, /FATAL/);
});

test('config : en production avec le secret par défaut connu → refus de démarrer', () => {
  const r = loadConfigInChild({ NODE_ENV: 'production', JWT_SECRET: 'dev-secret-change-me-in-prod' });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /FATAL/);
});

test('config : en production avec un secret court → refus de démarrer', () => {
  const r = loadConfigInChild({ NODE_ENV: 'production', JWT_SECRET: 'trop-court' });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /FATAL/);
});

test('config : en production avec un vrai secret → démarre et expose le secret', () => {
  const r = loadConfigInChild({ NODE_ENV: 'production', JWT_SECRET: 'x'.repeat(40) });
  assert.equal(r.status, 0, 'doit charger sans erreur');
});

test('config : en développement sans JWT_SECRET → démarre avec le défaut (DX préservée)', () => {
  const r = loadConfigInChild({ NODE_ENV: 'development', JWT_SECRET: '' });
  assert.equal(r.status, 0, 'le mode dev doit rester sans .env');
});
