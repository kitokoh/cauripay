import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  MemoryHealthIndicator,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

/**
 * GET /health — liveness + readiness (convention GOURSI-OBS1).
 * - liveness : le process répond (200) ;
 * - readiness : Prisma (base) joignable + mémoire sous seuil.
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly prismaService: PrismaService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Liveness + readiness (DB, mémoire)' })
  @ApiOkResponse({ description: 'Service sain' })
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.prisma.pingCheck('database', this.prismaService),
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),
    ]);
  }
}
