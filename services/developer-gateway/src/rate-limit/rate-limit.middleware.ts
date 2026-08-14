import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RateLimitService } from './rate-limit.service';

/**
 * Middleware de rate limiting par clé API (Bearer sk_/pk_).
 * Exemption : /health et routes publiques.
 */
@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  constructor(private readonly rateLimit: RateLimitService) {}

  use(req: Request, res: Response, next: NextFunction) {
    if (req.path === '/health' || req.path.startsWith('/api/v1/docs')) {
      return next();
    }

    const auth = req.headers.authorization ?? '';
    const rawKey = auth.startsWith('Bearer ') ? auth.slice(7) : 'anonymous';
    const state = this.rateLimit.consume(rawKey);

    res.setHeader('X-RateLimit-Limit', String(state.limit));
    res.setHeader('X-RateLimit-Remaining', String(state.remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.floor(state.resetAt / 1000)));

    if (!state.allowed) {
      res.status(429).json({
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Quota dépassé : 1000 req/min par clé' },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] ?? 'unknown',
      });
      return;
    }
    next();
  }
}
