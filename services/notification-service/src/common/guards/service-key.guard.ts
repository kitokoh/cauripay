import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'node:crypto';
import { Request } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard';

/**
 * Garde des routes INTERNES du notification-service (GOURSI-026a) :
 * - X-Service-Key présent → doit correspondre à INTERNAL_SERVICE_KEY (comparaison temps constant).
 * - Absent → repli sur un Bearer JWT Keycloak valide (délégation à JwtAuthGuard).
 * Le header reste « optionnel mais présent » en inter-service : réel appelé le fournit toujours.
 */
@Injectable()
export class ServiceKeyGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly jwtGuard: JwtAuthGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.headers['x-service-key'] as string | undefined;
    const expected = this.config.get<string>('env.internalServiceKey')!;

    if (provided) {
      if (!safeEqual(provided, expected)) {
        throw new UnauthorizedException({
          code: 'INVALID_SERVICE_KEY',
          message: 'X-Service-Key invalide',
        });
      }
      return true;
    }

    // Pas de X-Service-Key : on accepte un Bearer JWT valide (auth alternative).
    return this.jwtGuard.canActivate(context);
  }
}

function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}
