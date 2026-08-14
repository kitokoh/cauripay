import { ConfigService } from '@nestjs/config';
import { LedgerClientService } from './ledger-client.service';

describe('LedgerClientService (GOURSI-022a)', () => {
  const config = {
    get: (key: string) =>
      ({
        'env.ledgerBaseUrl': 'http://ledger:3010',
        'env.internalServiceKey': 'cle-test',
        'env.ledgerTimeoutMs': 1000,
      })[key],
  } as unknown as ConfigService;

  const mockFetch = (status: number, body: unknown) =>
    jest.fn().mockResolvedValue({
      ok: status < 400,
      status,
      json: async () => body,
    });

  afterEach(() => jest.restoreAllMocks());

  it('transferAtomic OK → résultat typé', async () => {
    const data = { transactionId: 'tx-1', ledgerEntryIds: ['e1'], fromBalance: '9.00', toBalance: '1.00' };
    global.fetch = mockFetch(201, data) as any;
    const service = new LedgerClientService(config);
    const result = await service.transferAtomic({
      idempotencyKey: 'k',
      transactionId: 'tx-1',
      fromWalletId: 'a',
      toWalletId: 'b',
      amount: '1.00',
    });
    expect(result.ledgerEntryIds).toHaveLength(1);
    // header X-Service-Key présent
    const headers = (global.fetch as jest.Mock).mock.calls[0][1].headers;
    expect(headers['X-Service-Key']).toBe('cle-test');
  });

  it('422 INSUFFICIENT_FUNDS → LedgerError typé (code préservé)', async () => {
    global.fetch = mockFetch(422, {
      code: 'INSUFFICIENT_FUNDS',
      message: 'Solde insuffisant',
      details: { available: '1.00' },
      timestamp: new Date().toISOString(),
    }) as any;
    const service = new LedgerClientService(config);
    await expect(
      service.transferAtomic({ idempotencyKey: 'k', transactionId: 't', fromWalletId: 'a', toWalletId: 'b', amount: '2.00' }),
    ).rejects.toMatchObject({ status: 422, code: 'INSUFFICIENT_FUNDS' });
  });

  it('409 IDEMPOTENCY_CONFLICT → LedgerError 409', async () => {
    global.fetch = mockFetch(409, { code: 'IDEMPOTENCY_CONFLICT', message: 'Clé déjà utilisée' }) as any;
    const service = new LedgerClientService(config);
    await expect(service.getBalance('w-1')).rejects.toMatchObject({ status: 409, code: 'IDEMPOTENCY_CONFLICT' });
  });

  it('timeout → ServiceUnavailableException LEDGER_UNAVAILABLE', async () => {
    global.fetch = jest.fn().mockImplementation((_url: string, init: RequestInit) => {
      init.signal?.addEventListener('abort', () => undefined);
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      });
    }) as any;
    const service = new LedgerClientService(config);
    await expect(service.getBalance('w-1')).rejects.toMatchObject({
      response: { code: 'LEDGER_UNAVAILABLE' },
    });
  });
});
