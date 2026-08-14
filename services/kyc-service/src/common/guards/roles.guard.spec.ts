import 'reflect-metadata';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@goursi/shared-types';
import { RolesGuard } from './roles.guard';

describe('RolesGuard (GOURSI-020b) — kyc-service', () => {
  const makeContext = (user: { realm_access?: { roles?: string[] } } | undefined): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
      getHandler: () => (): void => undefined,
      getClass: () => class {},
    }) as unknown as ExecutionContext;

  const makeGuard = (required: UserRole[] | undefined): RolesGuard => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(required) } as unknown as Reflector;
    return new RolesGuard(reflector);
  };

  it('COMPLIANCE_OFFICER accède à la file', () => {
    const ok = makeGuard([UserRole.COMPLIANCE_OFFICER]).canActivate(
      makeContext({ realm_access: { roles: ['COMPLIANCE_OFFICER'] } }),
    );
    expect(ok).toBe(true);
  });

  it('CUSTOMER → 403 (critère d’acceptation GOURSI-024c)', () => {
    expect(() =>
      makeGuard([UserRole.COMPLIANCE_OFFICER]).canActivate(
        makeContext({ realm_access: { roles: ['CUSTOMER'] } }),
      ),
    ).toThrow(ForbiddenException);
  });
});
