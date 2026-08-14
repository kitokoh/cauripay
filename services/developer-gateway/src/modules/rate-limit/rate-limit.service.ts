import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { REDIS, RedisClient } from '../../prisma/redis.module';

export const RATE_LIMIT_MAX = 1000; // 1000 req/min par clé (GOURSI-050b)
export const RATE_LIMIT_WINDOW_MS = 60_000;

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** epoch seconds — moment où la fenêtre glissante se réinitialise */
  resetAt: number;
}

/**
 * Rate limiting par clé (GOURSI-050b) : fenêtre glissante Redis (sorted set
 * par clé, timestamps). Les entrées hors fenêtre sont purgées, le décompte
 * courant est comparé à la limite, la clé expire pour ne jamais fuiter.
 */
@Injectable()
export class RateLimitService {
  constructor(@Inject(REDIS) private readonly redis: RedisClient) {}

  async check(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const minScore = now - RATE_LIMIT_WINDOW_MS;
    const zkey = `rl:${key}`;

    // Purge des requêtes hors fenêtre (glissement)
    await this.redis.zremrangebyscore(zkey, 0, minScore);

    // Plus ancienne requête restante → permet de calculer le reset
    const oldest = await this.redis.zrange(zkey, 0, 0, 'WITHSCORES');
    const count = await this.redis.zcard(zkey);

    const allowed = count < RATE_LIMIT_MAX;
    if (allowed) {
      await this.redis.zadd(zkey, now, `${now}-${randomUUID()}`);
      await this.redis.expire(zkey, Math.ceil(RATE_LIMIT_WINDOW_MS / 1000));
    }

    const remaining = Math.max(0, RATE_LIMIT_MAX - count - (allowed ? 1 : 0));
    const resetAt =
      oldest.length >= 2
        ? Math.ceil((Number(oldest[1]) + RATE_LIMIT_WINDOW_MS) / 1000)
        : Math.ceil((now + RATE_LIMIT_WINDOW_MS) / 1000);

    return { allowed, limit: RATE_LIMIT_MAX, remaining, resetAt };
  }
}
