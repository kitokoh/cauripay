import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import jwksClient from 'jwks-rsa';

export interface JwtPayload {
  sub: string;
  iss: string;
  realm_access?: { roles?: string[] };
  preferred_username?: string;
  phone?: string;
  [key: string]: unknown;
}

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

/**
 * Guard JWT Keycloak RS256 (pattern api-core GOURSI-020b) : vérifie la signature via JWKS,
 * l'émetteur, et extrait les rôles (realm_access.roles).
 * Utilisé par ServiceKeyGuard pour les routes internes (auth alternative au X-Service-Key).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly jwks: ReturnType<typeof jwksClient>;

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {
    this.jwks = jwksClient({
      jwksUri: this.config.get<string>('env.jwksUrl')!,
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearer(request);
    if (!token) {
      throw new UnauthorizedException({ code: 'MISSING_TOKEN', message: 'Token manquant' });
    }
    try {
      const signingKey = await this.jwks.getSigningKey();
      const publicKey = signingKey.getPublicKey();
      const payload = this.jwtService.verify<JwtPayload>(token, {
        publicKey,
        algorithms: ['RS256'],
        issuer: this.config.get<string>('env.jwtIssuer'),
      });
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
