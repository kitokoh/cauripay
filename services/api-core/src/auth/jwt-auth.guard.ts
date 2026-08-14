import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { JwtVerifierService } from './jwt-verifier.service';

/**
 * Guard global JWT Keycloak RS256 (GOURSI-020b).
 * - routes @Public() : bypass ;
 * - sinon : Authorization: Bearer <token> obligatoire, validé (issuer, RS256, exp) ;
 * - le payload { sub, roles } est attaché à request.user.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly verifier: JwtVerifierService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token manquant — Authorization: Bearer <jwt>');
    }

    try {
      const { sub, roles } = await this.verifier.verify(header.slice('Bearer '.length));
      request.user = { sub, roles };
      return true;
    } catch (err) {
      this.logger.warn(`JWT invalide : ${(err as Error).message}`);
      throw new UnauthorizedException('Token invalide ou expiré');
    }
  }
}
