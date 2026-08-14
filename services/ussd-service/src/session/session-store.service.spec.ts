import { RedisClient } from '../redis/redis.module';
import { SESSION_TTL_SECONDS, SessionStoreService, UssdSession } from './session-store.service';

const SESSION_KEY = 'ussd:session:sess-1';
const SEEN_KEY = 'ussd:seen:sess-1';

describe('SessionStoreService (GOURSI-027a) — Redis mocké', () => {
  let redis: { get: jest.Mock; set: jest.Mock; del: jest.Mock; exists: jest.Mock };
  let store: SessionStoreService;

  const session: UssdSession = { msisdn: '+23566000001', step: 'main', lang: 'fr', data: {} };

  beforeEach(() => {
    redis = { get: jest.fn(), set: jest.fn(), del: jest.fn(), exists: jest.fn() };
    store = new SessionStoreService(redis as unknown as RedisClient);
  });

  it('set : stocke le JSON sous ussd:session:<id> avec TTL 180 s + marqueur vu', async () => {
    await store.set('sess-1', session);
    expect(redis.set).toHaveBeenCalledWith(
      SESSION_KEY,
      JSON.stringify(session),
      'EX',
      SESSION_TTL_SECONDS,
    );
    expect(redis.set).toHaveBeenCalledWith(SEEN_KEY, '1', 'EX', expect.any(Number));
  });

  it('get : retourne la session parsée', async () => {
    redis.get.mockResolvedValue(JSON.stringify(session));
    const result = await store.get('sess-1');
    expect(result).toEqual(session);
    expect(redis.get).toHaveBeenCalledWith(SESSION_KEY);
  });

  it('get : null si la clé n’existe pas (session expirée)', async () => {
    redis.get.mockResolvedValue(null);
    await expect(store.get('sess-1')).resolves.toBeNull();
  });

  it('get : null si le JSON est corrompu', async () => {
    redis.get.mockResolvedValue('{pas du json');
    await expect(store.get('sess-1')).resolves.toBeNull();
  });

  it('clear : supprime uniquement la clé de session (le marqueur vu reste)', async () => {
    await store.clear('sess-1');
    expect(redis.del).toHaveBeenCalledWith(SESSION_KEY);
    expect(redis.del).not.toHaveBeenCalledWith(SEEN_KEY);
  });

  it('hasSeen : true après set, false pour un sessionId inconnu', async () => {
    redis.exists.mockResolvedValue(1);
    await expect(store.hasSeen('sess-1')).resolves.toBe(true);
    redis.exists.mockResolvedValue(0);
    await expect(store.hasSeen('autre')).resolves.toBe(false);
  });

  it('le TTL de session est bien 180 s (constante spec GOURSI-027a)', () => {
    expect(SESSION_TTL_SECONDS).toBe(180);
  });
});
