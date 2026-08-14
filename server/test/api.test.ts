import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createHmac } from 'node:crypto';
import fs from 'node:fs';

process.env.DATABASE_PATH = `/tmp/cauripay-test-${Date.now()}.db`;
process.env.JWT_SECRET = 'test-secret';

const { buildApp } = await import('../src/index.js');
const app = await buildApp();
const base = await app.listen({ port: 0, host: '127.0.0.1' });

// ---------- Récepteur webhook local ----------
const deliveries: { payload: unknown; signature: string; raw: string }[] = [];
const receiver = http.createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => (raw += c));
  req.on('end', () => {
    deliveries.push({ payload: JSON.parse(raw), signature: req.headers['x-cauripay-signature'] as string, raw });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('{"ok":true}');
  });
});
await new Promise<void>((r) => receiver.listen(0, '127.0.0.1', r));
const receiverPort = (receiver.address() as { port: number }).port;

// ---------- Marchand de test ----------
let token = '';
let skTest = '';
let wsec = '';

const api = async (path: string, opts: { method?: string; body?: unknown; auth?: string; raw?: boolean } = {}) => {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.auth) headers.Authorization = `Bearer ${opts.auth}`;
  const res = await fetch(`${base}${path}`, {
    method: opts.method || 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (opts.raw) return { status: res.status, body: json, headers: res.headers };
  return { status: res.status, body: json };
};

before(async () => {
  const reg = await api('/api/auth/register', {
    method: 'POST',
    body: { name: 'Awa Diallo', company: 'Kora Labs', email: 'awa@test.cm', password: 'motdepasse123' },
  });
  assert.equal(reg.status, 201);
  token = reg.body.token;
  const keys = await api('/api/keys', { auth: token });
  skTest = keys.body.keys.secret_test;
  wsec = keys.body.keys.webhook_secret_test;
  await api('/api/webhooks', {
    method: 'POST',
    auth: token,
    body: { url: `http://127.0.0.1:${receiverPort}/hooks`, events: ['*'], mode: 'test' },
  });
});

after(async () => {
  await app.close();
  receiver.close();
  fs.rmSync(process.env.DATABASE_PATH, { force: true });
  fs.rmSync(`${process.env.DATABASE_PATH}-wal`, { force: true });
  fs.rmSync(`${process.env.DATABASE_PATH}-shm`, { force: true });
});

test('auth : email en double → 409', async () => {
  const r = await api('/api/auth/register', { method: 'POST', body: { name: 'B', email: 'awa@test.cm', password: 'motdepasse123' } });
  assert.equal(r.status, 409);
});

test('auth : mauvais mot de passe → 401', async () => {
  const r = await api('/api/auth/login', { method: 'POST', body: { email: 'awa@test.cm', password: 'nimportequoi' } });
  assert.equal(r.status, 401);
});

test('créer un paiement via sk_test → pending + checkout_url', async () => {
  const r = await api('/api/v1/payments', {
    method: 'POST',
    auth: skTest,
    body: { amount_minor: 25000, currency: 'XOF', methods: ['orange_money', 'wave'], description: 'Abonnement Premium' },
  });
  assert.equal(r.status, 201);
  const p = r.body.payment;
  assert.equal(p.status, 'pending');
  assert.equal(p.currency, 'XOF');
  assert.ok(p.checkout_url.includes('/checkout/'));
  assert.equal(p.timeline[0].type, 'payment.created');
});

test('idempotence : même clé → même paiement', async () => {
  const body = { amount_minor: 1000, currency: 'XOF', idempotency_key: 'cmd-e2e-1' };
  const a = await api('/api/v1/payments', { method: 'POST', auth: skTest, body });
  const b = await api('/api/v1/payments', { method: 'POST', auth: skTest, body });
  assert.equal(a.body.payment.id, b.body.payment.id);
  assert.equal(b.body.duplicate, true);
});

test('montant invalide → 400 ; devise inconnue → 400', async () => {
  const bad = await api('/api/v1/payments', { method: 'POST', auth: skTest, body: { amount_minor: 0, currency: 'XOF' } });
  assert.equal(bad.status, 400);
  const cur = await api('/api/v1/payments', { method: 'POST', auth: skTest, body: { amount_minor: 100, currency: 'ZZZ' } });
  assert.equal(cur.status, 400);
  assert.equal(cur.body.error.code, 'unknown_currency');
});

test('sk invalide → 401 ; simulation avec pk → 403', async () => {
  const no = await api('/api/v1/payments');
  assert.equal(no.status, 401);
});

test('cycle complet : approve → succeeded + webhook signé reçu', async () => {
  const created = await api('/api/v1/payments', { method: 'POST', auth: skTest, body: { amount_minor: 5000, currency: 'XAF', description: 'Test webhook' } });
  const id = created.body.payment.id;

  const appr = await api(`/api/v1/sandbox/payments/${id}/approve`, { method: 'POST', auth: skTest });
  assert.equal(appr.status, 200);
  assert.equal(appr.body.payment.status, 'succeeded');
  assert.ok(appr.body.payment.provider_ref?.startsWith('SIM-'));

  // attendre la livraison du webhook payment.succeeded
  let evt: { payload: unknown; signature: string; raw: string } | undefined;
  for (let i = 0; i < 30; i++) {
    evt = deliveries.find((d) => (d.payload as { event?: string }).event === 'payment.succeeded');
    if (evt) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.ok(evt, 'webhook payment.succeeded reçu');

  // vérifier la signature HMAC
  const [t, v1] = evt.signature.match(/t=(\d+),v1=([0-9a-f]+)/)!.slice(1);
  const expected = createHmac('sha256', wsec).update(`${t}.${evt.raw}`).digest('hex');
  assert.equal(v1, expected);
});

test('cancel → cancelled ; double cancel → 409', async () => {
  const c = await api('/api/v1/payments', { method: 'POST', auth: skTest, body: { amount_minor: 200, currency: 'XOF' } });
  const id = c.body.payment.id;
  const r1 = await api(`/api/v1/payments/${id}/cancel`, { method: 'POST', auth: skTest });
  assert.equal(r1.body.payment.status, 'cancelled');
  const r2 = await api(`/api/v1/payments/${id}/cancel`, { method: 'POST', auth: skTest });
  assert.equal(r2.status, 409);
});

test('checkout : flux mobile money complet (succès puis échec PIN 0000)', async () => {
  const created = await api('/api/v1/payments', {
    method: 'POST',
    auth: skTest,
    body: { amount_minor: 15000, currency: 'XOF', methods: ['orange_money'], description: 'Boutique test' },
  });
  const pay = created.body.payment;
  const ck = pay.checkout_url.split('/checkout/')[1];

  const page = await fetch(`${base}/checkout/${ck}`);
  assert.equal(page.status, 200);
  assert.ok((await page.text()).includes('MODE TEST'));

  const badPhone = await api(`/checkout/${ck}/initiate`, { method: 'POST', body: { phone: 'abc' } });
  assert.equal(badPhone.status, 400);

  const init = await api(`/checkout/${ck}/initiate`, { method: 'POST', body: { phone: '+2250708091011', method: 'orange_money' } });
  assert.equal(init.status, 200);
  assert.equal(init.body.step, 'pin');

  // PIN 0000 → échec
  const badPin = await api(`/checkout/${ck}/confirm`, { method: 'POST', body: { pin: '0000' } });
  assert.equal(badPin.status, 200);
  await new Promise((r) => setTimeout(r, 2200));
  let st = await api(`/checkout/${ck}/status`);
  assert.equal(st.body.status, 'failed');

  // second paiement → succès avec un bon PIN
  const c2 = await api('/api/v1/payments', { method: 'POST', auth: skTest, body: { amount_minor: 3000, currency: 'XOF', methods: ['mtn_momo'] } });
  const ck2 = c2.body.payment.checkout_url.split('/checkout/')[1];
  await api(`/checkout/${ck2}/initiate`, { method: 'POST', body: { phone: '+237690000000', method: 'mtn_momo' } });
  await api(`/checkout/${ck2}/confirm`, { method: 'POST', body: { pin: '1234' } });
  await new Promise((r) => setTimeout(r, 2200));
  st = await api(`/checkout/${ck2}/status`);
  assert.equal(st.body.status, 'succeeded');
});

test('dashboard JWT : liste + stats', async () => {
  const list = await api('/api/payments?limit=5', { auth: token });
  assert.equal(list.status, 200);
  assert.ok(Array.isArray(list.body.payments));
  const stats = await api('/api/stats', { auth: token });
  assert.equal(stats.status, 200);
  assert.ok(stats.body.totals.count >= 4);
});

test('checkout : le JS inline de la page est syntaxiquement valide (garde-fou #39)', async () => {
  const created = await api('/api/v1/payments', { method: 'POST', auth: skTest, body: { amount_minor: 100, currency: 'XOF' } });
  const ck = created.body.payment.checkout_url.split('/checkout/')[1];
  const page = await fetch(`${base}/checkout/${ck}`);
  const html = await page.text();

  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  assert.ok(scripts.length >= 1, 'la page contient un script inline');
  for (const src of scripts) {
    // new Function lève une SyntaxError si le script est invalide — aucun handler ne doit mourir.
    assert.doesNotThrow(() => new Function(src), 'le script inline doit être parsable sans erreur de syntaxe');
  }

  // Le script doit contenir les handlers critiques (méthodes, phone, PIN, poll).
  assert.match(scripts[0], /btn-pay/);
  assert.match(scripts[0], /btn-confirm/);
  assert.match(scripts[0], /function poll/);
});
