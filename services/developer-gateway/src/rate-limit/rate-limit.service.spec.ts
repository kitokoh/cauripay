import { RateLimitService } from './rate-limit.service';

describe('RateLimitService', () => {
  let service: RateLimitService;

  beforeEach(() => {
    service = new RateLimitService();
  });

  it('autorise sous le quota avec headers corrects', () => {
    const r = service.consume('sk_test_1');
    expect(r.allowed).toBe(true);
    expect(r.limit).toBe(1000);
    expect(r.remaining).toBe(999);
    expect(r.resetAt).toBeGreaterThan(Date.now());
  });

  it('quotas indépendants par clé', () => {
    service.consume('sk_test_a');
    service.consume('sk_test_a');
    const r2 = service.consume('sk_test_b'); // clé B démarre à 1000-1
    expect(r2.remaining).toBe(999);
  });

  it('dépasse le quota → allowed=false', () => {
    // Injecte 1000 consommations
    for (let i = 0; i < 1000; i++) service.consume('sk_test_heavy');
    const r = service.consume('sk_test_heavy');
    expect(r.allowed).toBe(false);
    expect(r.remaining).toBe(0);
  });

  it('réinitialise la fenêtre après 60 s', () => {
    const r1 = service.consume('sk_test_win');
    // on force la fenêtre à expirer
    const state = (
      service as unknown as { buckets: Map<string, { windowStart: number; count: number }> }
    ).buckets;
    const key = [...state.keys()][0];
    state.set(key, { windowStart: Date.now() - 61_000, count: 1000 });
    const r2 = service.consume('sk_test_win');
    expect(r2.allowed).toBe(true);
    expect(r1.resetAt).toBeGreaterThan(0);
  });
});
