import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ApiKeysService } from './api-keys/api-keys.service';
import { DevWebhooksService } from './webhooks/dev-webhooks.service';
import { SandboxService } from './sandbox/sandbox.service';
import { ApiKeyGuard } from './api-keys/api-key.guard';
import { Public } from './common/public.decorator';

@ApiTags('dev')
@Controller('dev')
@UseGuards(ApiKeyGuard)
export class DevController {
  constructor(
    private readonly apiKeys: ApiKeysService,
    private readonly webhooks: DevWebhooksService,
    private readonly sandbox: SandboxService,
  ) {}

  // --- API keys (publiques : création avant auth par clé) ---
  @Public()
  @Post('api-keys')
  @ApiOperation({ summary: 'Crée une clé sandbox (renvoyée UNE seule fois)' })
  createKey(
    @Body() dto: { developerId: string; mode?: 'sandbox' | 'live'; prefix?: 'sk_' | 'pk_' },
  ) {
    return this.apiKeys.create(dto.developerId, dto.mode ?? 'sandbox', dto.prefix ?? 'sk_');
  }

  @Post('api-keys/:id/revoke')
  @ApiOperation({ summary: 'Révoque une clé → 401 aux appels suivants' })
  revoke(@Param('id') id: string) {
    return { revoked: this.apiKeys.revoke(id) };
  }

  @Post('api-keys/:id/rotate')
  @ApiOperation({ summary: 'Rotation : révoque + crée une nouvelle clé' })
  rotate(@Param('id') id: string, @Body() dto: { developerId: string }) {
    return this.apiKeys.rotate(dto.developerId, id);
  }

  // --- Sandbox ---
  @Post('payments')
  @ApiOperation({ summary: 'Initie un paiement sandbox (aucun appel prod)' })
  initiate(@Body() dto: { amountMinor: number; currency: string }) {
    return this.sandbox.initiate('dev', dto);
  }

  @Post('sandbox/payments/:id/approve')
  @ApiOperation({ summary: 'Simule un succès' })
  approve(@Param('id') id: string) {
    return this.sandbox.approve(id);
  }

  @Post('sandbox/payments/:id/fail')
  @ApiOperation({ summary: 'Simule un échec' })
  fail(@Param('id') id: string) {
    return this.sandbox.fail(id);
  }

  @Post('sandbox/payments/:id/expire')
  @ApiOperation({ summary: 'Simule une expiration' })
  expire(@Param('id') id: string) {
    return this.sandbox.expire(id);
  }

  // --- Webhooks ---
  @Post('webhooks')
  @ApiOperation({ summary: 'Enregistre un endpoint webhook (URL validée anti-SSRF)' })
  registerWebhook(@Body() dto: { developerId: string; url: string; events: string[] }) {
    return this.webhooks.register(dto.developerId, dto);
  }

  @Get('webhooks')
  @ApiOperation({ summary: 'Liste les endpoints' })
  listWebhooks(@Body() dto: { developerId: string }) {
    return this.webhooks.list(dto.developerId);
  }

  // --- Santé (publique) ---
  @Public()
  @Get('/health')
  health() {
    return { status: 'UP' };
  }
}
