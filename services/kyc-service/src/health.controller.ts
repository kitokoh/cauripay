import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';
import { ConfigService } from '@nestjs/config';

@Controller('health')
export class HealthController {
  constructor(private readonly config: ConfigService) {}

  @Get()
  @Public()
  health() {
    return { status: 'UP', service: 'kyc-service', version: '0.2.0', port: this.config.get('env.port') };
  }
}
