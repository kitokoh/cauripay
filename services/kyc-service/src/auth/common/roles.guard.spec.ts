import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

function contextWithRoles(roles: string[] | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user: { realm_access: { roles } } }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RolesGuard (GOURSI-024c)', () => {
  const reflector = {
    getAllAndOverride: (key: string) => (key === 'roles' ? ['COMPLIANCE_OFFICER'] : undefined),
  } as unknown as Reflector;

  it('autorise un officier compliance', () => {
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(contextWithRoles(['CUSTOMER', 'COMPLIANCE_OFFICER']))).toBe(true);
  });

  it('refuse (403) un client sans le rôle', () => {
    const guard = new RolesGuard(reflector);
    expect(() => guard.canActivate(contextWithRoles(['CUSTOMER']))).toThrow(ForbiddenException);
  });

  it('refuse (403) un utilisateur sans rôles', () => {
    const guard = new RolesGuard(reflector);
    expect(() => guard.canActivate(contextWithRoles(undefined))).toThrow(ForbiddenException);
  });
});
