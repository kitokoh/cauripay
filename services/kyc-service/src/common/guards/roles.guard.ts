import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthenticatedRequest } from './jwt-auth.guard';

/** Guard RBAC (GOURSI-020b) : rôles depuis realm_access.roles (Keycloak). */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const realmRoles: string[] = request.user?.realm_access?.roles ?? [];
    const has = requiredRoles.some((r) => realmRoles.includes(r));
    if (!has) {
      throw new ForbiddenException({ code: 'FORBIDDEN_ROLE', message: 'Rôle insuffisant' });
    }
    return true;
  }
}
