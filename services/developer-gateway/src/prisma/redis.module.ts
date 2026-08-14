import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

export const REDIS = 'REDIS';

/**
 * Connexion Redis unique (rate limiting par clé — fenêtre glissante).
 * Redis n'est jamais la source de vérité d'un solde.
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
