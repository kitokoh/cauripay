import 'reflect-metadata';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@goursi/shared-types';
import { RolesGuard } from './roles.guard';

describe('RolesGuard (GOURSI-020b)', () => {
  const makeContext = (user: { roles: string[] } | undefined): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
      getHandler: () => (): void => undefined,
      getClass: () => class {},
    }) as unknown as ExecutionContext;

  const makeGuard = (required: UserRole[] | undefined): RolesGuard => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(required),
    } as unknown as Reflector;
    return new RolesGuard(reflector);
  };

  it('laisse passer si aucune contrainte de rôle', () => {
    expect(makeGuard(undefined).canActivate(makeContext({ roles: [] }))).toBe(true);
  });

  it('rejette 403 si aucun utilisateur attaché', () => {
    expect(() => makeGuard([UserRole.SUPER_ADMIN]).canActivate(makeContext(undefined))).toThrow(
      ForbiddenException,
    );
  });

  it('laisse passer si l’utilisateur a le rôle requis', () => {
    const ok = makeGuard([UserRole.SUPPORT_L2]).canActivate(
      makeContext({ roles: ['CUSTOMER', 'SUPPORT_L2'] }),
    );
    expect(ok).toBe(true);
  });

  it('rejette 403 si l’utilisateur n’a pas le rôle requis', () => {
    expect(() =>
      makeGuard([UserRole.COMPLIANCE_OFFICER]).canActivate(makeContext({ roles: ['CUSTOMER'] })),
    ).toThrow(ForbiddenException);
  });
});
