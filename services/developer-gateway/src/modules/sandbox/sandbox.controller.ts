import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SandboxService } from './sandbox.service';
import { SandboxEventDto } from './dto/sandbox-event.dto';
import { SandboxPaymentDto } from './dto/sandbox-payment.dto';
import { Public } from '../../common/decorators/public.decorator';
import { ApiKeyGuard, ApiKeyIdentity as ApiKeyIdentityT } from '../../common/guards/api-key.guard';
import { ApiKeyIdentity } from '../../common/decorators/api-key-identity.decorator';

/**
 * Sandbox développeur (GOURSI-050c) — protégé par clé API, jamais de prod.
 * POST /dev/sandbox/payments/approve|fail|expire + POST /dev/sandbox/events.
 */
@ApiTags('dev/sandbox')
@ApiBearerAuth()
@Public()
@UseGuards(ApiKeyGuard)
@Controller('dev/sandbox')
export class SandboxController {
  constructor(private readonly sandbox: SandboxService) {}

  @Post('payments/approve')
  approve(@ApiKeyIdentity() apiKey: ApiKeyIdentityT, @Body() dto: SandboxPaymentDto) {
    return this.sandbox.paymentOutcome(apiKey.apiKeyId, 'approve', dto);
  }

  @Post('payments/fail')
  fail(@ApiKeyIdentity() apiKey: ApiKeyIdentityT, @Body() dto: SandboxPaymentDto) {
    return this.sandbox.paymentOutcome(apiKey.apiKeyId, 'fail', dto);
  }

  @Post('payments/expire')
  expire(@ApiKeyIdentity() apiKey: ApiKeyIdentityT, @Body() dto: SandboxPaymentDto) {
    return this.sandbox.paymentOutcome(apiKey.apiKeyId, 'expire', dto);
  }

  @Post('events')
  events(@ApiKeyIdentity() apiKey: ApiKeyIdentityT, @Body() dto: SandboxEventDto) {
    return this.sandbox.dispatch(apiKey.apiKeyId, dto.type, dto.data ?? {});
  }
}
