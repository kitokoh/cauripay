import { GoursiClient, GoursiApiError } from './index';
import { createHmac } from 'crypto';

describe('GoursiClient', () => {
  const secret = '0123456789abcdef0123456789abcdef';

  function sign(body: string, t = Math.floor(Date.now() / 1000)) {
    return `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')}`;
  }

  describe('verifySignature', () => {
    const client = new GoursiClient({ apiKey: 'sk_test_123', sandbox: true });

    it('vérifie une signature valide', () => {
      const body = JSON.stringify({ paymentId: 'p1', status: 'succeeded' });
      expect(client.verifySignature(secret, sign(body), body)).toBe(true);
    });

    it('rejette un payload modifié', () => {
      const body = JSON.stringify({ paymentId: 'p1', status: 'succeeded' });
      const tampered = JSON.stringify({ paymentId: 'p1', status: 'failed' });
      expect(client.verifySignature(secret, sign(body), tampered)).toBe(false);
    });

    it('rejette une signature expirée (> 5 min)', () => {
      const body = '{}';
      const old = Math.floor(Date.now() / 1000) - 301;
      expect(client.verifySignature(secret, sign(body, old), body)).toBe(false);
    });

    it('rejette un format invalide', () => {
      expect(client.verifySignature(secret, 'garbage', '{}')).toBe(false);
    });
  });

  describe('constructor', () => {
    it('exige une clé sk_', () => {
      expect(() => new GoursiClient({ apiKey: 'pk_test_1' })).toThrow('sk_');
    });
  });

  describe('paymentsInitiate', () => {
    it('appelle l’API sandbox et mappe le résultat', async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            data: { id: 'pay_1', status: 'pending', amountMinor: 2500, currency: 'XAF' },
          }),
      }) as unknown as typeof fetch;

      const client = new GoursiClient({ apiKey: 'sk_test_123', sandbox: true });
      const result = await client.paymentsInitiate({
        amountMinor: 2500,
        currency: 'XAF',
        to: '+23566000001',
      });
      expect(result.id).toBe('pay_1');
      expect(result.status).toBe('pending');

      const [url, options] = (globalThis.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe('https://sandbox.api.goursi.dev/v1/payments');
      expect(options.headers.Authorization).toBe('Bearer sk_test_123');
    });

    it('lève GoursiApiError avec le code API', async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: () =>
          Promise.resolve({
            success: false,
            error: { code: 'INSUFFICIENT_FUNDS', message: 'Solde insuffisant' },
          }),
      }) as unknown as typeof fetch;

      const client = new GoursiClient({ apiKey: 'sk_test_123', sandbox: true });
      await expect(
        client.paymentsInitiate({ amountMinor: 1, currency: 'XAF', to: 'x' }),
      ).rejects.toMatchObject({
        status: 422,
        code: 'INSUFFICIENT_FUNDS',
      });
      await expect(
        client.paymentsInitiate({ amountMinor: 1, currency: 'XAF', to: 'x' }),
      ).rejects.toBeInstanceOf(GoursiApiError);
    });
  });
});
