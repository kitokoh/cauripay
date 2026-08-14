import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

export const REDIS = 'REDIS';

/**
 * Connexion Redis unique (GOURSI-027a) : sessions USSD stateful, TTL 180 s.
 * Redis n'est jamais la source de vérité d'un solde — les opérations d'argent
 * passent exclusivement par api-core → ledger-service.
 */
@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis => {
        const client = new Redis(config.get<string>('env.redisUrl')!, {
          maxRetriesPerRequest: 3,
          lazyConnect: false,
        });
        client.on('error', (err) => {
          // eslint-disable-next-line no-console
          console.error('Redis error:', err.message);
        });
        return client;
      },
    },
  ],
  exports: [REDIS],
})
export class RedisModule {}

export type RedisClient = Redis;
