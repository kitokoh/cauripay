import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ApiKeysService } from '../api-keys/api-keys.service';

/**
 * Guard d'auth par clé API (Bearer sk_/pk_) sur les routes développeur.
 * Clé révoquée → 401.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeys: ApiKeysService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const auth = request.headers.authorization as string | undefined;
    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedException({ code: 'MISSING_API_KEY', message: 'Bearer sk_ requis' });
    }
    const key = this.apiKeys.authenticate(auth.slice(7));
    if (!key) {
      throw new UnauthorizedException({
        code: 'INVALID_OR_REVOKED_KEY',
        message: 'Clé invalide ou révoquée',
      });
    }
    request.apiKey = key;
    return true;
  }
}
