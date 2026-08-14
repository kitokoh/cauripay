import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedRequest } from './jwt-auth.guard';
import { UserRole } from '@goursi/shared-types';

export const ROLES_KEY = 'roles';

/**
 * Guard RBAC (GOURSI-020b) : un token CUSTOMER ne peut pas accéder aux routes SUPER_ADMIN.
 * Les rôles proviennent de realm_access.roles (Keycloak) et sont mappés sur UserRole.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const realmRoles: string[] = request.user?.realm_access?.roles ?? [];
    const hasRole = requiredRoles.some((r) => realmRoles.includes(r));
    if (!hasRole) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Rôle insuffisant' });
    }
    return true;
  }
}
