import { GoursiClient } from '../src/client';
import { GoursiConfigError, GoursiNetworkError } from '../src/errors';

describe('GoursiClient', () => {
  it('refuse une apiKey manquante', () => {
    expect(() => new GoursiClient({ apiKey: '' })).toThrow(GoursiConfigError);
  });

  it('refuse une apiKey au mauvais format', () => {
    expect(() => new GoursiClient({ apiKey: 'cle-invalide' })).toThrow(GoursiConfigError);
  });

  it('accepte une clé sk_test_', () => {
    expect(() => new GoursiClient({ apiKey: 'sk_test_abc' })).not.toThrow();
  });
});

describe('Payments.initiate (mock fetch)', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('retourne le PaymentResult sur succès', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { id: 'pay_1', status: 'PENDING', amount: '25000', currency: 'XAF' },
        timestamp: new Date().toISOString(),
        requestId: 'req-1',
      }),
    }) as unknown as typeof fetch;

    const client = new GoursiClient({ apiKey: 'sk_test_abc', baseUrl: 'http://localhost' });
    const result = await client.payments.initiate({ amount: '25000', to: '+23566000001' });

    expect(result.id).toBe('pay_1');
    expect(result.status).toBe('PENDING');
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost/api/v1/payments',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer sk_test_abc' }),
      }),
    );
  });

  it('passe la Idempotency-Key si fournie', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { id: 'pay_1', status: 'PENDING', amount: '1', currency: 'XAF' },
      }),
    }) as unknown as typeof fetch;

    const client = new GoursiClient({ apiKey: 'sk_test_abc', baseUrl: 'http://localhost' });
    await client.payments.initiate({ amount: '100', to: 'x' }, 'cmd-123');

    const [, init] = (fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['Idempotency-Key']).toBe('cmd-123');
  });

  it('lève une GoursiError typée sur erreur API', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({
        success: false,
        error: { code: 'INSUFFICIENT_FUNDS', message: 'Solde insuffisant' },
        timestamp: '',
        requestId: 'req-2',
      }),
    }) as unknown as typeof fetch;

    const client = new GoursiClient({ apiKey: 'sk_test_abc', baseUrl: 'http://localhost' });
    await expect(client.payments.initiate({ amount: '99999999', to: 'x' })).rejects.toMatchObject({
      name: 'GoursiError',
      code: 'INSUFFICIENT_FUNDS',
      status: 422,
    });
  });

  it('lève une GoursiNetworkError sur timeout', async () => {
    globalThis.fetch = jest.fn().mockImplementation(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const err = new Error('aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }),
    ) as unknown as typeof fetch;

    const client = new GoursiClient({ apiKey: 'sk_test_abc', baseUrl: 'http://localhost', timeoutMs: 10 });
    await expect(client.payments.initiate({ amount: '100', to: 'x' })).rejects.toBeInstanceOf(GoursiNetworkError);
  });
});
