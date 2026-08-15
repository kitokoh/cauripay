import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

process.env.DATABASE_PATH = `/tmp/cauripay-throttle-test-${Date.now()}.db`;
process.env.JWT_SECRET = 'test-secret';
process.env.CHECKOUT_MAX_PIN_FAILURES = '3';
process.env.CHECKOUT_BLOCK_MINUTES = '10';

const { registerPinFailure, isCheckoutBlocked, clearCheckoutThrottle } = await import('../src/throttle.js');

test('throttle : au 3e échec de PIN le token est bloqué, puis débloqué', () => {
  assert.equal(registerPinFailure('ck_t1'), false);
  assert.equal(registerPinFailure('ck_t1'), false);
  assert.equal(isCheckoutBlocked('ck_t1'), false);
  assert.equal(registerPinFailure('ck_t1'), true, '3e échec → blocage');
  assert.equal(isCheckoutBlocked('ck_t1'), true);
  clearCheckoutThrottle('ck_t1');
  assert.equal(isCheckoutBlocked('ck_t1'), false);
});

test('throttle : les tokens sont indépendants', () => {
  registerPinFailure('ck_a');
  assert.equal(isCheckoutBlocked('ck_b'), false);
});

after(() => {
  fs.rmSync(process.env.DATABASE_PATH as string, { force: true });
  fs.rmSync(`${process.env.DATABASE_PATH}-wal`, { force: true });
  fs.rmSync(`${process.env.DATABASE_PATH}-shm`, { force: true });
});
