import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import { RedisClient, REDIS } from './redis/redis.module';

/**
 * Liveness + readiness (GOURSI-020a). Pas de base de données — les sessions
 * vivent dans Redis : le check Redis suffit.
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly config: ConfigService,
    @Inject(REDIS) private readonly redis: RedisClient,
  ) {}

  @Get()
  async health() {
    let redisStatus = 'up';
    try {
      await this.redis.ping();
    } catch {
      redisStatus = 'down';
    }
    return {
      status: redisStatus === 'up' ? 'ok' : 'degraded',
      service: 'ussd-service',
      version: '0.1.0',
      port: this.config.get<number>('env.port'),
      checks: { redis: redisStatus },
      timestamp: new Date().toISOString(),
    };
  }
}
