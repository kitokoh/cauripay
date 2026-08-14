import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify } from 'jose';

/**
 * Guard global : valide un JWT signé par Keycloak (RS256, JWKS distant).
 * @Public() désactive le guard sur certaines routes (register, login, health).
 */
@Injectable()
export class JwtKeycloakGuard implements CanActivate {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(config: ConfigService) {
    const jwksUrl =
      config.get<string>('KEYCLOAK_JWKS_URL') ??
      'http://localhost:8080/realms/goursi/protocol/openid-connect/certs';
    this.jwks = createRemoteJWKSet(new URL(jwksUrl));
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = Reflect.getMetadata('isPublic', context.getHandler());
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization as string | undefined;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token manquant');
    }

    const token = authHeader.slice(7);
    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: process.env.KEYCLOAK_ISSUER ?? 'http://localhost:8080/realms/goursi',
      });
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Token invalide ou expiré');
    }
  }
}
