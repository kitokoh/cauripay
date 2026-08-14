import { CallHandler, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { RateLimitInterceptor } from './rate-limit.interceptor';
import { RateLimitService } from './rate-limit.service';

function makeContext(req: Record<string, unknown>, res: Record<string, unknown>) {
  return {
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  } as unknown as ExecutionContext;
}

const next = { handle: () => of({ ok: true }) } as CallHandler;

describe('RateLimitInterceptor (GOURSI-050b)', () => {
  it('pose les headers X-RateLimit-* sur chaque réponse /dev/*', async () => {
    const check = jest.fn().mockResolvedValue({ allowed: true, limit: 1000, remaining: 42, resetAt: 1700000060 });
    const interceptor = new RateLimitInterceptor({ check } as unknown as RateLimitService);

    const headers: Record<string, string> = {};
    const res = { setHeader: (k: string, v: string) => { headers[k] = v; } };
    const req = { path: '/api/v1/dev/webhooks', apiKey: { apiKeyId: 'sk-row-1' } };

    const result = await lastValueFrom(await interceptor.intercept(makeContext(req, res), next));

    expect(result).toEqual({ ok: true });
    expect(headers['X-RateLimit-Limit']).toBe('1000');
    expect(headers['X-RateLimit-Remaining']).toBe('42');
    expect(headers['X-RateLimit-Reset']).toBe('1700000060');
    expect(check).toHaveBeenCalledWith('api:sk-row-1');
  });

  it('dépassement → 429 { code: RATE_LIMITED } (enveloppe imbriquée par le filtre)', async () => {
    const check = jest.fn().mockResolvedValue({ allowed: false, limit: 1000, remaining: 0, resetAt: 1700000060 });
    const interceptor = new RateLimitInterceptor({ check } as unknown as RateLimitService);

    const res = { setHeader: jest.fn() };
    const req = { path: '/api/v1/dev/api-keys', user: { sub: 'user-1' } };

    const promise = interceptor.intercept(makeContext(req, res), next);
    await expect(promise).rejects.toBeInstanceOf(HttpException);
    await expect(promise).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
      response: { code: 'RATE_LIMITED' },
    });
  });

  it('GET /health exempté (pas de vérification, pas de headers)', async () => {
    const check = jest.fn();
    const interceptor = new RateLimitInterceptor({ check } as unknown as RateLimitService);

    const res = { setHeader: jest.fn() };
    const req = { path: '/api/v1/health' };

    const result = await lastValueFrom(await interceptor.intercept(makeContext(req, res), next));
    expect(result).toEqual({ ok: true });
    expect(check).not.toHaveBeenCalled();
    expect(res.setHeader).not.toHaveBeenCalled();
  });

  it('clé API prioritaire sur user pour l’identité de quota', async () => {
    const check = jest.fn().mockResolvedValue({ allowed: true, limit: 1000, remaining: 999, resetAt: 1700000060 });
    const interceptor = new RateLimitInterceptor({ check } as unknown as RateLimitService);

    const res = { setHeader: jest.fn() };
    const req = { path: '/api/v1/dev/sandbox/events', apiKey: { apiKeyId: 'sk-row-9' }, user: { sub: 'user-1' } };

    await lastValueFrom(await interceptor.intercept(makeContext(req, res), next));
    expect(check).toHaveBeenCalledWith('api:sk-row-9');
  });
});
