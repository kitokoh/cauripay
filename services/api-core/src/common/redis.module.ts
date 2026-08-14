import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

/**
 * Redis partagé (verrouillage login, OTP, sessions USSD…).
 * Connexion paresseuse au premier accès ; TTL gérés par appelant.
 */
export const REDIS = Symbol('REDIS');

export interface RedisProvider {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<'OK'>;
  del(key: string): Promise<number>;
  incr(key: string): Promise<number>;
  expire(key: string, ttlSeconds: number): Promise<number>;
}

const redisProvider = {
  provide: REDIS,
  useFactory: (config: ConfigService): RedisProvider => {
    const url = config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
    const client = new Redis(url);
    return {
      get: (k) => client.get(k),
      set: (k, v, ttl) => client.set(k, v, 'EX', ttl),
      del: (k) => client.del(k),
      incr: (k) => client.incr(k),
      expire: (k, ttl) => client.expire(k, ttl),
    };
  },
  inject: [ConfigService],
};

@Global()
@Module({
  providers: [redisProvider],
  exports: [REDIS],
})
export class RedisModule {}
