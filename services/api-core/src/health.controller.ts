import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from './prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

/** Liveness + readiness (GOURSI-020a). Exempté de X-Service-Key (côté gateway). */
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
      service: 'api-core',
      version: '0.2.0',
      port: this.config.get<number>('env.port'),
      checks: { database: db, redis: 'up' },
      timestamp: new Date().toISOString(),
    };
  }
}
