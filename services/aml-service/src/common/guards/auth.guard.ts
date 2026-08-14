import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { verify } from 'jsonwebtoken';

/**
 * Garde d'authentification AML : accepte X-Service-Key (inter-services,
 * comparée en temps constant) OU un JWT applicatif HS256 (JWT_SECRET) portant
 * les rôles (realm_access.roles). Les rôles sont vérifiés par RolesGuard.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    if (req.path.startsWith('/health')) return true; // liveness/readiness publiques
    const serviceKey = req.header('x-service-key');
    const expected = this.config.get<string>('INTERNAL_SERVICE_KEY');

    if (serviceKey && expected) {
      if (serviceKey.length === expected.length && timingSafeEqualStr(serviceKey, expected)) {
        (req as Request & { auth?: unknown }).auth = { kind: 'service' };
        return true;
      }
    }

    const authz = req.header('authorization');
    if (authz?.startsWith('Bearer ')) {
      const secret = this.config.get<string>('JWT_SECRET');
      if (secret) {
        try {
          const payload = verify(authz.slice(7), secret) as {
            sub?: string;
            realm_access?: { roles?: string[] };
            preferred_username?: string;
          };
          (req as Request & { auth?: unknown }).auth = {
            kind: 'jwt',
            userId: payload.sub,
            roles: payload.realm_access?.roles ?? [],
            username: payload.preferred_username,
          };
          return true;
        } catch {
          throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'JWT invalide ou expiré' });
        }
      }
    }

    throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'X-Service-Key ou Bearer requis' });
  }
}

function timingSafeEqualStr(a: string, b: string): boolean {
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
