import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';

export interface RateLimitState {
  count: number;
  windowStart: number;
}

/**
 * Rate limiting par clé API : 1000 req/min, fenêtre glissante.
 * Headers : X-RateLimit-Limit / Remaining / Reset. 429 { code: 'RATE_LIMITED' }.
 * En phase 0 : store mémoire ; en staging : Redis (INCR + EXPIRE).
 */
@Injectable()
export class RateLimitService {
  private readonly buckets = new Map<string, RateLimitState>();
  private readonly windowMs = 60_000;
  private readonly limit = 1000;

  /** Vérifie + incrémente le quota d'une clé. Retourne l'état du bucket. */
  consume(rawKey: string): { allowed: boolean; limit: number; remaining: number; resetAt: number } {
    const bucketKey = this.bucketKey(rawKey);
    const now = Date.now();
    const state = this.buckets.get(bucketKey);

    if (!state || now - state.windowStart >= this.windowMs) {
      const fresh: RateLimitState = { count: 1, windowStart: now };
      this.buckets.set(bucketKey, fresh);
      return {
        allowed: true,
        limit: this.limit,
        remaining: this.limit - 1,
        resetAt: now + this.windowMs,
      };
    }

    state.count += 1;
    const remaining = Math.max(0, this.limit - state.count);
    return {
      allowed: state.count <= this.limit,
      limit: this.limit,
      remaining,
      resetAt: state.windowStart + this.windowMs,
    };
  }

  private bucketKey(rawKey: string): string {
    return createHash('sha256').update(rawKey).digest('hex');
  }
}
