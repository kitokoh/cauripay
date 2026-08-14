import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { createServer, Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { LedgerClientService, LedgerError } from './ledger-client.service';

/**
 * CONTRACT TESTS api-core ↔ ledger-service (GOURSI-022c).
 * Référence : docs/API-ledger.md.
 *
 * Un serveur HTTP factice implémente LE CONTRAT (endpoints, enveloppes, codes) ;
 * le client est exercé contre lui. Si le contrat change d'un côté sans l'autre,
 * un test casse → la CI bloque.
 */
describe('Contrat api-core ↔ ledger-service (GOURSI-022c)', () => {
  let server: Server;
  let baseUrl: string;
  const requests: Array<{ method: string; url: string; headers: Record<string, string>; body: unknown }> = [];
  let responder: (req: { method: string; url: string; headers: Record<string, string> }) => {
    status: number;
    body: unknown;
  };

  const startServer = (): Promise<string> =>
    new Promise((resolve) => {
      server = createServer((req, res) => {
        let raw = '';
        req.on('data', (c) => (raw += c));
        req.on('end', () => {
          requests.push({
            method: req.method ?? '',
            url: req.url ?? '',
            headers: req.headers as Record<string, string>,
            body: raw ? JSON.parse(raw) : undefined,
          });
          const { status, body } = responder({
            method: req.method ?? '',
            url: req.url ?? '',
            headers: req.headers as Record<string, string>,
          });
          res.writeHead(status, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(body));
        });
      });
      server.listen(0, '127.0.0.1', () => {
        resolve(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
      });
    });

  const makeClient = (): LedgerClientService =>
    new LedgerClientService({
      get: (key: string) => {
        const map: Record<string, unknown> = {
          'env.ledgerBaseUrl': baseUrl,
          'env.internalServiceKey': 'test-internal-service-key',
          'env.ledgerTimeoutMs': 2000,
        };
        return map[key];
      },
    } as unknown as ConfigService);

  beforeAll(async () => {
    baseUrl = await startServer();
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  beforeEach(() => {
    requests.length = 0;
    responder = () => ({ status: 500, body: { success: false, error: { code: 'INTERNAL_ERROR', message: 'x' } } });
  });

  it('POST /internal/ledger/transfer — enveloppe {success,data} + X-Service-Key (happy path)', async () => {
    responder = () => ({
      status: 201,
      body: {
        success: true,
        data: {
          transactionId: 'tx-1',
          entryIds: ['e1', 'e2', 'e3', 'e4'],
          fromBalance: '900.00',
          toBalance: '1100.00',
        },
        timestamp: new Date().toISOString(),
        requestId: 'req-1',
      },
    });

    const result = await makeClient().transferAtomic({
      idempotencyKey: 'idem-1',
      transactionId: 'tx-1',
      fromWalletId: 'w-1',
      toWalletId: 'w-2',
      amount: '100.00',
    });

    expect(requests[0]).toMatchObject({ method: 'POST', url: '/internal/ledger/transfer' });
    expect(requests[0].headers['x-service-key']).toBe('test-internal-service-key');
    expect(requests[0].body).toMatchObject({ idempotencyKey: 'idem-1', amount: '100.00' });
    expect(result).toMatchObject({ transactionId: 'tx-1', entryIds: ['e1', 'e2', 'e3', 'e4'] });
  });

  it('GET /internal/ledger/balance/{walletId} — 200 BalanceResponse', async () => {
    responder = () => ({
      status: 200,
      body: {
        success: true,
        data: { walletId: 'w-1', balance: '1000.00', frozenBalance: '0.00', version: 3 },
      },
    });
    const balance = await makeClient().getBalance('w-1');
    expect(requests[0].url).toBe('/internal/ledger/balance/w-1');
    expect(balance).toMatchObject({ walletId: 'w-1', balance: '1000.00' });
  });

  it('409 IDEMPOTENCY_CONFLICT → LedgerError(409) typé', async () => {
    responder = () => ({
      status: 409,
      body: {
        success: false,
        error: { code: 'IDEMPOTENCY_CONFLICT', message: 'Clé déjà utilisée', details: { idempotencyKey: 'idem-1' } },
      },
    });
    const client = makeClient();
    await expect(
      client.transferAtomic({
        idempotencyKey: 'idem-1',
        transactionId: 'tx-1',
        fromWalletId: 'w-1',
        toWalletId: 'w-2',
        amount: '100.00',
      }),
    ).rejects.toMatchObject<LedgerError>({ status: 409, code: 'IDEMPOTENCY_CONFLICT' } as LedgerError);
  });

  it('422 INSUFFICIENT_FUNDS → LedgerError(422) avec détails', async () => {
    responder = () => ({
      status: 422,
      body: {
        success: false,
        error: {
          code: 'INSUFFICIENT_FUNDS',
          message: 'Solde insuffisant',
          details: { walletId: 'w-1', available: '10.00', required: '100.00' },
        },
      },
    });
    await expect(
      makeClient().debit({
        idempotencyKey: 'idem-2',
        transactionId: 'tx-2',
        walletId: 'w-1',
        amount: '100.00',
      }),
    ).rejects.toMatchObject({ status: 422, code: 'INSUFFICIENT_FUNDS', details: { required: '100.00' } } as LedgerError);
  });

  it('401 (X-Service-Key invalide) → LedgerError(401)', async () => {
    responder = () => ({
      status: 401,
      body: { success: false, error: { code: 'UNAUTHORIZED', message: 'Clé invalide' } },
    });
    await expect(makeClient().getBalance('w-1')).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHORIZED',
    } as LedgerError);
  });

  it('500 → LedgerError(500) sans détail interne (message stable)', async () => {
    responder = () => ({
      status: 500,
      body: { success: false, error: { code: 'INTERNAL_ERROR', message: 'Erreur interne' } },
    });
    await expect(makeClient().getBalance('w-1')).rejects.toMatchObject({
      status: 500,
      code: 'INTERNAL_ERROR',
    } as LedgerError);
  });

  it('ledger injoignable → ServiceUnavailableException (LEDGER_UNAVAILABLE)', async () => {
    const client = new LedgerClientService({
      get: (key: string) => {
        const map: Record<string, unknown> = {
          'env.ledgerBaseUrl': 'http://127.0.0.1:1', // port fermé
          'env.internalServiceKey': 'k',
          'env.ledgerTimeoutMs': 500,
        };
        return map[key];
      },
    } as unknown as ConfigService);
    await expect(client.getBalance('w-1')).rejects.toMatchObject({ status: 503 });
  });
});
