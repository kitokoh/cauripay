import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@goursi/shared-types';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { ROLES_KEY } from '../common/decorators/roles.decorator';

/**
 * Guard de rôles (GOURSI-020b) : @Roles('SUPPORT_L2') — roles issus du token Keycloak
 * (realm_access.roles). À utiliser APRÈS JwtAuthGuard (global, ordre d'enregistrement).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }
    const hasRole = required.some((role) => user.roles.includes(role));
    if (!hasRole) {
      throw new ForbiddenException(`Rôle requis : ${required.join(', ')}`);
    }
    return true;
  }
}
