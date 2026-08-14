import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedRequest } from './jwt-auth.guard';

export const ROLES_KEY = 'roles';

/** Guard rôles Keycloak (realm_access.roles) — 403 hors rôle (GOURSI-024c). */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const roles = request.user?.realm_access?.roles ?? [];
    if (!required.some((role) => roles.includes(role))) {
      throw new ForbiddenException({ code: 'FORBIDDEN_ROLE', message: 'Rôle insuffisant' });
    }
    return true;
  }
}
