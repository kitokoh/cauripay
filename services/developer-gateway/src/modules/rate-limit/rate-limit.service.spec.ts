import { RateLimitService, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS } from './rate-limit.service';

/**
 * Fake Redis (ioredis) : sorted set en mémoire, interface minimale utilisée
 * par RateLimitService — comportement identique (prune hors fenêtre, comptage).
 */
class FakeRedis {
  private store = new Map<string, Map<string, number>>();

  async zremrangebyscore(key: string, _min: number, max: number) {
    const members = this.store.get(key);
    if (!members) return 0;
    let removed = 0;
    for (const [member, score] of [...members]) {
      if (score <= max) {
        members.delete(member);
        removed++;
      }
    }
    if (members.size === 0) this.store.delete(key);
    return removed;
  }

  async zrange(key: string, start: number, stop: number, withScores?: 'WITHSCORES') {
    const members = this.store.get(key);
    if (!members) return [];
    const sorted = [...members.entries()].sort((a, b) => a[1] - b[1]).slice(start, stop + 1);
    if (withScores === 'WITHSCORES') {
      return sorted.flatMap(([m, s]) => [m, String(s)]);
    }
    return sorted.map(([m]) => m);
  }

  async zcard(key: string) {
    return this.store.get(key)?.size ?? 0;
  }

  async zadd(key: string, score: number, member: string) {
    if (!this.store.has(key)) this.store.set(key, new Map());
    this.store.get(key)!.set(member, score);
    return 1;
  }

  async expire(_key: string, _seconds: number) {
    return 1;
  }
}

describe('RateLimitService (GOURSI-050b) — fenêtre glissante Redis', () => {
  const NOW = 1_700_000_000_000;

  const makeService = () => {
    jest.useFakeTimers({ now: NOW });
    const redis = new FakeRedis();
    return { service: new RateLimitService(redis as never) };
  };

  afterEach(() => {
    jest.useRealTimers();
  });

  it('1000 req/min autorisées ; la 1001e (2e burst dans la fenêtre) → refusée', async () => {
    const { service } = makeService();

    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      const r = await service.check('sk_test_keyA');
      expect(r.allowed).toBe(true);
    }
    const denied = await service.check('sk_test_keyA');
    expect(denied.allowed).toBe(false);
    expect(denied.remaining).toBe(0);
    expect(denied.limit).toBe(RATE_LIMIT_MAX);
  });

  it('résultat exposé : limit=1000, remaining décroissant, resetAt dans le futur', async () => {
    const { service } = makeService();
    const r1 = await service.check('sk_test_keyB');
    expect(r1.limit).toBe(1000);
    expect(r1.remaining).toBe(999);
    expect(r1.resetAt).toBeGreaterThan(NOW / 1000);

    for (let i = 0; i < 100; i++) {
      await service.check('sk_test_keyB');
    }
    const r2 = await service.check('sk_test_keyB');
    expect(r2.remaining).toBe(1000 - 102);
  });

  it('2 clés = 2 quotas indépendants', async () => {
    const { service } = makeService();
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      await service.check('sk_test_keyC');
    }
    // clé C saturée…
    expect((await service.check('sk_test_keyC')).allowed).toBe(false);
    // …mais la clé D garde son quota entier
    const firstD = await service.check('sk_test_keyD');
    expect(firstD.allowed).toBe(true);
    expect(firstD.remaining).toBe(999);
  });

  it('fenêtre glissante : après 60 s les entrées expirent → quota à nouveau disponible', async () => {
    const { service } = makeService();
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      await service.check('sk_test_keyE');
    }
    expect((await service.check('sk_test_keyE')).allowed).toBe(false);

    // La fenêtre glisse : les requêtes les plus anciennes sortent
    jest.advanceTimersByTime(RATE_LIMIT_WINDOW_MS + 1);
    const after = await service.check('sk_test_keyE');
    expect(after.allowed).toBe(true);
    expect(after.remaining).toBe(RATE_LIMIT_MAX - 1);
  });

  it('resetAt = moment où la plus ancienne requête sort de la fenêtre', async () => {
    const { service } = makeService();
    await service.check('sk_test_keyF'); // t0
    jest.advanceTimersByTime(10_000);
    await service.check('sk_test_keyF'); // t0+10s
    const r = await service.check('sk_test_keyF'); // t0+20s
    // plus ancienne requête à t0 → reset à t0 + 60s
    expect(r.resetAt).toBe(Math.ceil((NOW + RATE_LIMIT_WINDOW_MS) / 1000));
  });
});
