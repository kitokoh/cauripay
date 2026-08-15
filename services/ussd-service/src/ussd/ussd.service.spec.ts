import { RedisClient } from '../redis/redis.module';
import { SessionStoreService, UssdSession } from '../session/session-store.service';
import { ApiCoreClientService, ApiCoreError } from './api-core-client.service';
import { UssdService, UssdSessionResponse } from './ussd.service';

/** Redis en mémoire — simule le store (TTL simulé par suppression de clé). */
class FakeRedis {
  private readonly map = new Map<string, string>();
  async get(k: string): Promise<string | null> {
    return this.map.get(k) ?? null;
  }
  async set(k: string, v: string): Promise<string> {
    this.map.set(k, v);
    return 'OK';
  }
  async del(k: string): Promise<number> {
    return this.map.delete(k) ? 1 : 0;
  }
  async exists(k: string): Promise<number> {
    return this.map.has(k) ? 1 : 0;
  }
  raw(): Map<string, string> {
    return this.map;
  }
}

describe('UssdService (GOURSI-027d) — flows complets, api-core mocké', () => {
  let fakeRedis: FakeRedis;
  let store: SessionStoreService;
  let apiCore: { getBalance: jest.Mock; transfer: jest.Mock };
  let service: UssdService;

  const MSISDN = '+23566000001';
  const SID = 'sess-1';

  beforeEach(() => {
    fakeRedis = new FakeRedis();
    store = new SessionStoreService(fakeRedis as unknown as RedisClient);
    apiCore = { getBalance: jest.fn(), transfer: jest.fn() };
    service = new UssdService(store, apiCore as unknown as ApiCoreClientService);
  });

  it('Solde : fr → 1 → texte solde formaté + fin de session', async () => {
    apiCore.getBalance.mockResolvedValue({
      walletId: 'w1', balance: '2500000.00', frozenBalance: '0.00', availableBalance: '2500000.00', version: 1,
    });
    const first = await service.handle(SID, MSISDN, 'fr');
    expect(first.endOfSession).toBe(false);
    expect(first.text).toContain('Solde');

    const second = await service.handle(SID, MSISDN, '1');
    expect(second.endOfSession).toBe(true);
    expect(second.text).toContain('2 500 000,00');
    expect(second.text).toContain('FCFA');
    expect(apiCore.getBalance).toHaveBeenCalledWith(MSISDN);
  });

  it('Envoi : fr → 2 → numéro → montant → confirmer → api-core.transfer avec le bon payload', async () => {
    apiCore.transfer.mockResolvedValue({ id: 'tx-123', status: 'SUCCESS', amountMinor: '10000' });
    const inputs = ['fr', '2', '66000002', '10000', '1'];
    let last: UssdSessionResponse = { text: '', endOfSession: false };
    for (const input of inputs) {
      last = await service.handle(SID, MSISDN, input);
    }
    expect(last.endOfSession).toBe(true);
    expect(last.text).toContain('10 000,00');
    expect(last.text).toContain('66000002');
    expect(last.text).toContain('tx-123');
    expect(apiCore.transfer).toHaveBeenCalledWith({
      idempotencyKey: expect.stringMatching(/^ussd-\+23566000001-\d+$/),
      fromMsisdn: MSISDN,
      toAccountNumber: '66000002',
      amountMinor: '10000',
      description: 'Envoi USSD *100#',
    });
  });

  it('Facture (stub) : fr → 3 → SNE → montant → confirmer → fin de session sans appel api-core', async () => {
    const inputs = ['fr', '3', '1', '5000', '1'];
    let last: UssdSessionResponse = { text: '', endOfSession: false };
    for (const input of inputs) {
      last = await service.handle(SID, MSISDN, input);
    }
    expect(last.endOfSession).toBe(true);
    expect(last.text).toContain('SNE');
    expect(last.text).toContain('5 000,00');
    expect(apiCore.transfer).not.toHaveBeenCalled();
    expect(apiCore.getBalance).not.toHaveBeenCalled();
  });

  it('Retrait (stub OTP) : fr → 4 → OTP → confirmer → fin de session', async () => {
    const inputs = ['fr', '4', '123456', '1'];
    let last: UssdSessionResponse = { text: '', endOfSession: false };
    for (const input of inputs) {
      last = await service.handle(SID, MSISDN, input);
    }
    expect(last.endOfSession).toBe(true);
    expect(last.text).toContain('Demande de retrait');
  });

  it('Session expirée : clé session absente mais sessionId déjà vu → "Session expirée"', async () => {
    // Session créée puis « expirée » (TTL 180 s écoulé → clé supprimée).
    await service.handle(SID, MSISDN, 'fr');
    fakeRedis.raw().delete('ussd:session:' + SID);
    const resp = await service.handle(SID, MSISDN, '2');
    expect(resp.endOfSession).toBe(true);
    expect(resp.text).toContain('Session expirée');
    expect(apiCore.getBalance).not.toHaveBeenCalled();
  });

  it('Nouvelle session (sessionId jamais vu) → démarre au choix de langue', async () => {
    const resp = await service.handle('sess-fresh', MSISDN, '');
    expect(resp.endOfSession).toBe(false);
    expect(resp.text).toContain('Choisissez la langue');
  });

  it('Entrée invalide au menu principal → "Saisie invalide", session continue', async () => {
    await service.handle(SID, MSISDN, 'fr');
    const resp = await service.handle(SID, MSISDN, '9');
    expect(resp.endOfSession).toBe(false);
    expect(resp.text).toContain('Saisie invalide');
    expect(resp.text).toContain('1. Solde');
  });

  it('Reprise de session : après "fr", la session garde step=main et la langue', async () => {
    await service.handle(SID, MSISDN, 'fr');
    const stored = await store.get(SID);
    expect(stored?.step).toBe('main');
    expect(stored?.lang).toBe('fr');
  });

  it('Erreur api-core (503) sur solde → texte convivial, fin de session', async () => {
    apiCore.getBalance.mockRejectedValue(new ApiCoreError(503, 'API_CORE_UNAVAILABLE', 'indisponible'));
    await service.handle(SID, MSISDN, 'fr');
    const resp = await service.handle(SID, MSISDN, '1');
    expect(resp.endOfSession).toBe(true);
    expect(resp.text).toContain('Service indisponible');
  });

  it('Solde insuffisant sur envoi → message clair', async () => {
    apiCore.transfer.mockRejectedValue(new ApiCoreError(422, 'INSUFFICIENT_FUNDS', 'Solde insuffisant'));
    const inputs = ['fr', '2', '66000002', '9999999', '1'];
    let last: UssdSessionResponse = { text: '', endOfSession: false };
    for (const input of inputs) {
      last = await service.handle(SID, MSISDN, input);
    }
    expect(last.endOfSession).toBe(true);
    expect(last.text).toContain('Solde insuffisant');
  });

  it('Session arabe : ar → 1 → texte solde en arabe', async () => {
    apiCore.getBalance.mockResolvedValue({
      walletId: 'w1', balance: '100.00', frozenBalance: '0.00', availableBalance: '100.00', version: 1,
    });
    await service.handle(SID, MSISDN, 'ar');
    const resp = await service.handle(SID, MSISDN, '1');
    expect(resp.endOfSession).toBe(true);
    expect(resp.text).toContain('رصيدك هو');
  });

  it('La session est nettoyée après une action terminale', async () => {
    apiCore.getBalance.mockResolvedValue({
      walletId: 'w1', balance: '100.00', frozenBalance: '0.00', availableBalance: '100.00', version: 1,
    });
    await service.handle(SID, MSISDN, 'fr');
    await service.handle(SID, MSISDN, '1');
    const stored = await store.get(SID);
    expect(stored).toBeNull();
  });

  it('Type de session persistant : UssdSession stockée avec msisdn/step/lang/data', async () => {
    await service.handle(SID, MSISDN, 'fr');
    const raw = fakeRedis.raw().get('ussd:session:' + SID);
    const parsed = JSON.parse(raw ?? '{}') as UssdSession;
    expect(parsed.msisdn).toBe(MSISDN);
    expect(parsed.step).toBe('main');
    expect(parsed.lang).toBe('fr');
    expect(parsed.data).toEqual({});
  });
});
