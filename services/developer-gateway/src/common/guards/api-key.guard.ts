import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiKeyMode, ApiKeyStatus } from '../../../node_modules/.prisma/developer-gateway-client';
import { constantTimeEqual, sha256Hex } from '../utils/hashing';

export interface ApiKeyIdentity {
  apiKeyId: string;
  mode: ApiKeyMode;
  ownerUserId: string;
}

export interface ApiKeyRequest extends Request {
  apiKey?: ApiKeyIdentity;
}

/**
 * Auth par clé API (GOURSI-050a) sur les routes développeur /api/v1/dev/* :
 * Authorization: Bearer sk_... (ou pk_... en lecture seule GET).
 * La clé est hachée sha256 puis comparée en TEMPS CONSTANT au hash stocké.
 * Clé révoquée ou inconnue → 401. Ne jamais logger la clé.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ApiKeyRequest>();
    const [type, token] = request.headers.authorization?.split(' ') ?? [];

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException({ code: 'MISSING_API_KEY', message: 'Clé API manquante (Bearer sk_ ou pk_)' });
    }

    const isSecret = token.startsWith('sk_');
    const isPublic = token.startsWith('pk_');
    if (!isSecret && !isPublic) {
      throw new UnauthorizedException({ code: 'INVALID_API_KEY', message: 'Clé API invalide' });
    }
    if (!isSecret && request.method !== 'GET') {
      throw new UnauthorizedException({ code: 'INVALID_API_KEY', message: 'pk_ autorisée en lecture seule (GET)' });
    }

    const hash = sha256Hex(token);
    const apiKey = await this.prisma.apiKey.findUnique({ where: { keyHash: hash } });
    // Comparaison temps constant hash calculé vs hash stocké (anti timing attack)
    if (!apiKey || !constantTimeEqual(hash, apiKey.keyHash)) {
      throw new UnauthorizedException({ code: 'INVALID_API_KEY', message: 'Clé API inconnue' });
    }
    if (apiKey.status !== ApiKeyStatus.ACTIVE || apiKey.revokedAt !== null) {
      throw new UnauthorizedException({ code: 'API_KEY_REVOKED', message: 'Clé API révoquée' });
    }

    request.apiKey = {
      apiKeyId: apiKey.id,
      mode: apiKey.mode,
      ownerUserId: apiKey.ownerUserId,
    };

    // lastUsedAt — mise à jour best effort, jamais bloquante
    void this.prisma.apiKey
      .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);

    return true;
  }
}
