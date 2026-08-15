import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('health')
export class HealthController {
  constructor(private readonly config: ConfigService) {}

  @Get()
  liveness(): { status: string; service: string; version: string; uptime_s: number } {
    return { status: 'ok', service: 'aml-service', version: '0.2.0', uptime_s: Math.round(process.uptime()) };
  }

  @Get('ready')
  readiness(): { status: string; port: number } {
    return { status: 'ok', port: this.config.get<number>('PORT', 3040)! };
  }
}
