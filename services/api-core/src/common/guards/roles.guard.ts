import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@cauripay/shared-types';

/**
 * Guard de rôles : vérifie que le JWT (payload Keycloak) contient un rôle requis.
 * Usage : @Roles(UserRole.SUPPORT_L2)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const payload = request.user;
    const roles: string[] = payload?.realm_access?.roles ?? payload?.roles ?? [];
    const ok = requiredRoles.some((r) => roles.includes(r));
    if (!ok) {
      throw new ForbiddenException('Rôle insuffisant');
    }
    return true;
  }
}
