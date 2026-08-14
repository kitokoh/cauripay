/**
 * GOURSI-027d — DoD #8 : le simulateur/les tests exécutent les 4 opérations
 * USSD complètes, de bout en bout à travers UssdService (session Redis mockée
 * en mémoire + client api-core mocké). Rappel : aucune I/O réelle.
 */
import { RedisClient } from '../src/redis/redis.module';
import { SessionStoreService } from '../src/session/session-store.service';
import { UssdService, UssdSessionResponse } from '../src/ussd/ussd.service';
import { ApiCoreClientService } from '../src/ussd/api-core-client.service';

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

describe('GOURSI-027d — DoD #8 : 4 opérations complètes (unit, api-core mocké)', () => {
  const MSISDN = '+23566000001';
  let fakeRedis: FakeRedis;
  let store: SessionStoreService;
  let apiCore: { getBalance: jest.Mock; transfer: jest.Mock };
  let service: UssdService;
  let sessionCounter: number;

  beforeEach(() => {
    fakeRedis = new FakeRedis();
    store = new SessionStoreService(fakeRedis as unknown as RedisClient);
    apiCore = { getBalance: jest.fn(), transfer: jest.fn() };
    service = new UssdService(store, apiCore as unknown as ApiCoreClientService);
    sessionCounter = 0;
  });

  /** Exécute une séquence d'entrées et renvoie la dernière réponse. */
  async function run(inputs: string[]): Promise<UssdSessionResponse> {
    sessionCounter += 1;
    const sid = `dod-${sessionCounter}`;
    let last = { text: '', endOfSession: false };
    for (const input of inputs) {
      last = await service.handle(sid, MSISDN, input);
    }
    return last;
  }

  it('1) Solde : fr → 1 → solde formaté affiché', async () => {
    apiCore.getBalance.mockResolvedValue({
      walletId: 'w1', balance: '2500000.00', frozenBalance: '0.00', availableBalance: '2500000.00', version: 1,
    });
    const resp = await run(['fr', '1']);
    expect(resp.endOfSession).toBe(true);
    expect(resp.text).toContain('Votre solde est de 2 500 000,00 FCFA');
  });

  it('2) Envoi : fr → 2 → numéro → montant → 1 → api-core.transfer appelé', async () => {
    apiCore.transfer.mockResolvedValue({ id: 'tx-999', status: 'SUCCESS' });
    const resp = await run(['fr', '2', '66000002', '10000', '1']);
    expect(resp.endOfSession).toBe(true);
    expect(resp.text).toContain('Transfert de 10 000,00 FCFA vers 66000002 réussi');
    expect(apiCore.transfer).toHaveBeenCalledWith(
      expect.objectContaining({ toAccountNumber: '66000002', amountMinor: '10000' }),
    );
  });

  it('3) Facture : fr → 3 → SNE → montant → 1 → confirmation (stub)', async () => {
    const resp = await run(['fr', '3', '1', '5000', '1']);
    expect(resp.endOfSession).toBe(true);
    expect(resp.text).toContain('Paiement de facture enregistré');
    expect(resp.text).toContain('SNE');
  });

  it('4) Retrait : fr → 4 → OTP → 1 → confirmation (stub OTP)', async () => {
    const resp = await run(['fr', '4', '123456', '1']);
    expect(resp.endOfSession).toBe(true);
    expect(resp.text).toContain('Demande de retrait enregistrée');
  });

  it('Expiration de session : TTL écoulé (clé supprimée) → "Session expirée"', async () => {
    apiCore.getBalance.mockResolvedValue({
      walletId: 'w1', balance: '100.00', frozenBalance: '0.00', availableBalance: '100.00', version: 1,
    });
    // Démarre une session puis simule l'expiration du TTL 180 s.
    await run(['fr']);
    const sid = 'dod-expired';
    await service.handle(sid, MSISDN, 'fr');
    fakeRedis.raw().delete('ussd:session:' + sid); // TTL écoulé
    const resp = await service.handle(sid, MSISDN, '2');
    expect(resp.endOfSession).toBe(true);
    expect(resp.text).toContain('Session expirée');
  });

  it('La session est reprise si l’utilisateur revient (même sessionId, < 180 s)', async () => {
    const sid = 'dod-resume';
    await service.handle(sid, MSISDN, 'fr');
    const resume = await service.handle(sid, MSISDN, '2'); // revient sur « Envoyer »
    expect(resume.endOfSession).toBe(false);
    expect(resume.text).toContain('Numéro du destinataire');
  });

  it('Saisies invalides → messages "Saisie invalide" sans casser la session', async () => {
    await service.handle('dod-inv', MSISDN, 'fr');
    const bad = await service.handle('dod-inv', MSISDN, 'zz');
    expect(bad.text).toContain('Saisie invalide');
    const ok = await service.handle('dod-inv', MSISDN, '2');
    expect(ok.text).toContain('Numéro du destinataire');
  });
});
