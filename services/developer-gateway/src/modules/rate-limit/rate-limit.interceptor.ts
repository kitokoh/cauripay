import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Response } from 'express';
import { RateLimitService } from './rate-limit.service';
import { ApiKeyRequest } from '../../common/guards/api-key.guard';
import { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard';

/**
 * Rate limiting applicatif (GOURSI-050b) :
 * - headers X-RateLimit-Limit / Remaining / Reset sur chaque réponse /dev/*
 * - dépassement → 429 { code: 'RATE_LIMITED' } (enveloppe d'erreur imbriquée
 *   appliquée par AllExceptionsFilter)
 * - GET /health exempté ; identité = apiKeyId (routes clé API) ou user (JWT).
 */
@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  constructor(private readonly rateLimit: RateLimitService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const req = context
      .switchToHttp()
      .getRequest<ApiKeyRequest & AuthenticatedRequest>();
    const res = context.switchToHttp().getResponse<Response>();

    if (req.path.endsWith('/health')) {
      return next.handle();
    }

    const key = req.apiKey ? `api:${req.apiKey.apiKeyId}` : req.user ? `user:${req.user.sub}` : null;
    if (!key) {
      return next.handle();
    }

    const result = await this.rateLimit.check(key);
    res.setHeader('X-RateLimit-Limit', String(result.limit));
    res.setHeader('X-RateLimit-Remaining', String(result.remaining));
    res.setHeader('X-RateLimit-Reset', String(result.resetAt));

    if (!result.allowed) {
      throw new HttpException(
        { code: 'RATE_LIMITED', message: 'Quota dépassé : 1000 requêtes/min par clé' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return next.handle();
  }
}
