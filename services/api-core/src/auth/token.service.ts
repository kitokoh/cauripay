import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../common/guards/jwt-auth.guard';
import { User } from '@prisma/client';

/**
 * Émission de JWT applicatif (dev/MPIN) — signature HS256 avec JWT_SECRET.
 * En SSO Keycloak, les tokens RS256 (JWKS) restent la voie principale.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  signAccessToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      iss: this.config.get<string>('env.jwtIssuer')!,
      preferred_username: user.phone,
      phone: user.phone,
      realm_access: { roles: [user.role] },
    };
    return this.jwtService.sign(payload, {
      secret: this.config.get<string>('env.jwtSecret'),
      expiresIn: '15m',
    });
  }

  signRefreshToken(user: User): string {
    return this.jwtService.sign(
      { sub: user.id, kind: 'refresh', phone: user.phone },
      { secret: this.config.get<string>('env.jwtSecret'), expiresIn: '7d' },
    );
  }

  verifyRefreshToken(token: string): { sub: string; kind: string } {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.config.get<string>('env.jwtSecret'),
      }) as { sub: string; kind: string };
      if (payload.kind !== 'refresh') {
        throw new UnauthorizedException({ code: 'INVALID_REFRESH', message: 'Token non refresh' });
      }
      return payload;
    } catch (e) {
      throw new UnauthorizedException({ code: 'INVALID_REFRESH', message: 'Refresh token invalide ou expiré' });
    }
  }
}
