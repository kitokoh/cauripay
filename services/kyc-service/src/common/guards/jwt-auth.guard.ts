import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import jwksClient from 'jwks-rsa';

export interface JwtPayload {
  sub: string;
  iss?: string;
  realm_access?: { roles?: string[] };
  preferred_username?: string;
  [key: string]: unknown;
}

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

/**
 * Guard JWT (GOURSI-020b) : production = RS256 Keycloak via JWKS ;
 * développement/test = HS256 (JWT_SECRET) pour un démarrage sans Keycloak.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly jwks: ReturnType<typeof jwksClient> | null;

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {
    const jwksUrl = this.config.get<string>('env.jwksUrl');
    this.jwks = jwksUrl
      ? jwksClient({ jwksUri: jwksUrl, cache: true, rateLimit: true, jwksRequestsPerMinute: 10 })
      : null;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearer(request);
    if (!token) {
      throw new UnauthorizedException({ code: 'MISSING_TOKEN', message: 'Token manquant' });
    }
    try {
      let payload: JwtPayload;
      if (this.jwks) {
        const signingKey = await this.jwks.getSigningKey();
        payload = this.jwtService.verify<JwtPayload>(token, {
          publicKey: signingKey.getPublicKey(),
          algorithms: ['RS256'],
          issuer: this.config.get<string>('env.jwtIssuer'),
        });
      } else {
        payload = this.jwtService.verify<JwtPayload>(token, {
          secret: this.config.get<string>('env.jwtSecret'),
          algorithms: ['HS256'],
        });
      }
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException({ code: 'INVALID_TOKEN', message: 'Token invalide ou expiré' });
    }
  }

  private extractBearer(request: Request): string | null {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' && token ? token : null;
  }
}
