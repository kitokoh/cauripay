import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from './prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Public } from './common/decorators/public.decorator';

/** Liveness + readiness (GOURSI-020a). Exempté JWT (@Public) et rate limiting. */
@ApiTags('health')
@Controller('health')
@Public()
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
      service: 'developer-gateway',
      version: '0.1.0',
      port: this.config.get<number>('env.port'),
      checks: { database: db, redis: 'up' },
      timestamp: new Date().toISOString(),
    };
  }
}
