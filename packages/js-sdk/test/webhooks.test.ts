import { createHmac } from 'node:crypto';
import { Webhooks } from '../src/webhooks';

const SECRET = 'whsec_test_secret_123';
const PAYLOAD = JSON.stringify({
  id: 'pay_123',
  event: 'payment.succeeded',
  amount: '25000',
});

function sign(timestampSeconds: number): string {
  const v1 = createHmac('sha256', SECRET)
    .update(`${timestampSeconds}.${PAYLOAD}`)
    .digest('hex');
  return `t=${timestampSeconds},v1=${v1}`;
}

describe('Webhooks.verifySignature', () => {
  it('accepte une signature valide dans la fenêtre', () => {
    const now = Math.floor(Date.now() / 1000);
    expect(new Webhooks(SECRET).verifySignature(sign(now), PAYLOAD)).toBe(true);
  });

  it('rejette une signature avec un mauvais secret', () => {
    const now = Math.floor(Date.now() / 1000);
    const bad = new Webhooks('whsec_autre_secret');
    expect(bad.verifySignature(sign(now), PAYLOAD)).toBe(false);
  });

  it('rejette un payload modifié (tampering)', () => {
    const now = Math.floor(Date.now() / 1000);
    const tampered = PAYLOAD.replace('25000', '99999');
    expect(new Webhooks(SECRET).verifySignature(sign(now), tampered)).toBe(false);
  });

  it('rejette un timestamp hors fenêtre (anti-replay)', () => {
    const old = Math.floor(Date.now() / 1000) - 3600; // 1 h avant
    expect(new Webhooks(SECRET).verifySignature(sign(old), PAYLOAD)).toBe(false);
  });

  it('rejette un timestamp dans le futur', () => {
    const future = Math.floor(Date.now() / 1000) + 3600;
    expect(new Webhooks(SECRET).verifySignature(sign(future), PAYLOAD)).toBe(false);
  });

  it('rejette un header malformé', () => {
    expect(new Webhooks(SECRET).verifySignature('garbage', PAYLOAD)).toBe(false);
    expect(new Webhooks(SECRET).verifySignature('', PAYLOAD)).toBe(false);
  });
});
