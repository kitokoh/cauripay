import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import jwksClient from 'jwks-rsa';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

export interface JwtPayload {
  sub: string;
  iss: string;
  realm_access?: { roles?: string[] };
  preferred_username?: string;
  [key: string]: unknown;
}

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

/**
 * Guard JWT global (GOURSI-020b) : RS256 via JWKS (Keycloak) avec fallback
 * HS256 (JWT_SECRET optionnel, dev) — AVANT RolesGuard (ordre APP_GUARD).
 * Les routes @Public() (health, routes clé API) sont exemptées.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly jwks: ReturnType<typeof jwksClient>;

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {
    this.jwks = jwksClient({
      jwksUri: this.config.get<string>('env.jwksUrl')!,
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearer(request);
    if (!token) {
      throw new UnauthorizedException({ code: 'MISSING_TOKEN', message: 'Token manquant' });
    }
    request.user = await this.verifyToken(token);
    return true;
  }

  private async verifyToken(token: string): Promise<JwtPayload> {
    try {
      const signingKey = await this.jwks.getSigningKey();
      return this.jwtService.verify<JwtPayload>(token, {
        publicKey: signingKey.getPublicKey(),
        algorithms: ['RS256'],
        issuer: this.config.get<string>('env.jwtIssuer'),
      });
    } catch {
      // Fallback HS256 (environnement de dev) — JWT_SECRET optionnel
      const secret = this.config.get<string>('env.jwtSecret');
      if (secret) {
        try {
          return this.jwtService.verify<JwtPayload>(token, {
            secret,
            algorithms: ['HS256'],
            issuer: this.config.get<string>('env.jwtIssuer'),
          });
        } catch {
          // ignore — token invalide également en HS256
        }
      }
      throw new UnauthorizedException({ code: 'INVALID_TOKEN', message: 'Token invalide ou expiré' });
    }
  }

  private extractBearer(request: Request): string | null {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' && token ? token : null;
  }
}
