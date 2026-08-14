import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSafeWebhookUrl } from '../src/util.js';

test('anti-SSRF : IP privées/locales bloquées (#1)', async () => {
  const opts = { blockPrivate: true, requireHttps: false };
  for (const bad of [
    'http://127.0.0.1/h',
    'http://10.0.0.5/h',
    'http://172.16.1.1/h',
    'http://192.168.1.10/h',
    'http://169.254.169.254/h',
    'http://0.0.0.0/h',
    'http://[::1]/h',
    'http://[fc00::1]/h',
  ]) {
    const r = await isSafeWebhookUrl(bad, opts);
    assert.equal(r.ok, false, `${bad} doit être bloqué (anti-SSRF)`);
  }
  const ok = await isSafeWebhookUrl('http://8.8.8.8/h', opts);
  assert.equal(ok.ok, true);
});

test('production : https exigé pour les webhooks', async () => {
  const httpUrl = await isSafeWebhookUrl('http://8.8.8.8/h', { blockPrivate: true, requireHttps: true });
  assert.equal(httpUrl.ok, false);
  const httpsUrl = await isSafeWebhookUrl('https://8.8.8.8/h', { blockPrivate: true, requireHttps: true });
  assert.equal(httpsUrl.ok, true);
});

test('URL invalides / protocoles non supportés', async () => {
  const opts = { blockPrivate: true, requireHttps: false };
  assert.equal((await isSafeWebhookUrl('pas une url', opts)).ok, false);
  assert.equal((await isSafeWebhookUrl('ftp://x/y', opts)).ok, false);
  assert.equal((await isSafeWebhookUrl('file:///etc/passwd', opts)).ok, false);
});
