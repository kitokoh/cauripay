import 'reflect-metadata';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtVerifierService } from './jwt-verifier.service';

describe('JwtAuthGuard (GOURSI-020b)', () => {
  const verifier = {
    verify: jest.fn(),
    clearCache: jest.fn(),
  } as unknown as JwtVerifierService;

  const makeContext = (overrides: Record<string, unknown>): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => overrides.request ?? { headers: {} },
      }),
      getHandler: () => overrides.handler ?? ((): void => undefined),
      getClass: () => overrides.klass ?? class {},
    }) as unknown as ExecutionContext;

  const makeGuard = (isPublic: boolean): JwtAuthGuard => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(isPublic),
    } as unknown as Reflector;
    return new JwtAuthGuard(verifier, reflector);
  };

  beforeEach(() => jest.clearAllMocks());

  it('laisse passer les routes @Public()', async () => {
    const guard = makeGuard(true);
    await expect(guard.canActivate(makeContext({}))).resolves.toBe(true);
    expect(verifier.verify).not.toHaveBeenCalled();
  });

  it('rejette 401 si le header Authorization est absent', async () => {
    const guard = makeGuard(false);
    await expect(guard.canActivate(makeContext({ request: { headers: {} } }))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('valide le token et attache { sub, roles } à la requête', async () => {
    const guard = makeGuard(false);
    verifier.verify = jest.fn().mockResolvedValue({ sub: 'u-1', roles: ['CUSTOMER'] });
    const request = { headers: { authorization: 'Bearer abc.def.ghi' } };
    await expect(guard.canActivate(makeContext({ request }))).resolves.toBe(true);
    expect(request).toMatchObject({ user: { sub: 'u-1', roles: ['CUSTOMER'] } });
  });

  it('rejette 401 si le token est invalide', async () => {
    const guard = makeGuard(false);
    verifier.verify = jest.fn().mockRejectedValue(new Error('signature invalide'));
    await expect(
      guard.canActivate(makeContext({ request: { headers: { authorization: 'Bearer nope' } } })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
