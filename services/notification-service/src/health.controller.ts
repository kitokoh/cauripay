import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from './prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

/** Liveness + readiness (GOURSI-026a). Public — exempté de X-Service-Key. */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  async health() {
    let db = 'up';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      db = 'down';
    }
    return {
      status: db === 'up' ? 'ok' : 'degraded',
      service: 'notification-service',
      version: '0.2.0',
      port: this.config.get<number>('env.port'),
      checks: { database: db, rabbitmq: 'up' },
      timestamp: new Date().toISOString(),
    };
  }
}
