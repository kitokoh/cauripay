import { ConfigService } from '@nestjs/config';
import { ApiCoreClientService, ApiCoreError } from './api-core-client.service';

const KEY = 'dev_internal_service_key_change_me';

function makeClient(): ApiCoreClientService {
  const config = {
    get: jest.fn((k: string) =>
      k === 'env.apiCoreBaseUrl' ? 'http://api-core:3000' : k === 'env.internalServiceKey' ? KEY : undefined,
    ),
  } as unknown as ConfigService;
  return new ApiCoreClientService(config);
}

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: jest.fn().mockResolvedValue(body) } as unknown as Response;
}

describe('ApiCoreClientService (GOURSI-027c) — fetch mocké', () => {
  const fetchMock = jest.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockReset();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('getBalance : parse l’enveloppe api-core et renvoie le solde', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        success: true,
        data: { walletId: 'w1', balance: '2500000.00', frozenBalance: '0.00', availableBalance: '2500000.00', version: 1 },
      }),
    );
    const client = makeClient();
    const balance = await client.getBalance('+23566000001');
    expect(balance.availableBalance).toBe('2500000.00');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api-core:3000/api/v1/wallets/me/balance',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ 'X-Service-Key': KEY, 'X-User-Phone': '+23566000001' }),
      }),
    );
  });

  it('transfer : POST /api/v1/transactions/transfer avec le payload correct', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ success: true, data: { id: 'tx-1', status: 'SUCCESS', amountMinor: '10000.00' } }),
    );
    const client = makeClient();
    const res = await client.transfer({
      idempotencyKey: 'ussd-+23566000001-1700000000000',
      fromMsisdn: '+23566000001',
      toAccountNumber: '66000002',
      amountMinor: '10000',
      description: 'Envoi USSD *100#',
    });
    expect(res.id).toBe('tx-1');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://api-core:3000/api/v1/transactions/transfer');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      idempotencyKey: 'ussd-+23566000001-1700000000000',
      toAccountNumber: '66000002',
      amountMinor: '10000',
      description: 'Envoi USSD *100#',
    });
    expect(init.headers).toMatchObject({ 'X-Service-Key': KEY, 'X-User-Phone': '+23566000001' });
  });

  it('erreur api-core (non-ok) → ApiCoreError avec le code', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ code: 'KYC_LIMIT_EXCEEDED', message: 'Limite dépassée' }, false, 422),
    );
    const client = makeClient();
    await expect(client.getBalance('+23566000001')).rejects.toMatchObject({
      status: 422,
      code: 'KYC_LIMIT_EXCEEDED',
    });
  });

  it('réseau/api-core injoignable → ApiCoreError 503 API_CORE_UNAVAILABLE', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
    const client = makeClient();
    await expect(client.transfer({
      idempotencyKey: 'k'.repeat(10),
      fromMsisdn: '+23566000001',
      toAccountNumber: '66000002',
      amountMinor: '100',
    })).rejects.toBeInstanceOf(ApiCoreError);
    await expect(
      client.transfer({
        idempotencyKey: 'k'.repeat(10),
        fromMsisdn: '+23566000001',
        toAccountNumber: '66000002',
        amountMinor: '100',
      }),
    ).rejects.toMatchObject({ status: 503, code: 'API_CORE_UNAVAILABLE' });
  });
});
