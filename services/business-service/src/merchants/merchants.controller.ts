import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MerchantsService } from './merchants.service';
import { WebhooksService } from '../webhooks/webhooks.service';

@ApiTags('merchants')
@Controller('merchants')
export class MerchantsController {
  constructor(
    private readonly merchants: MerchantsService,
    private readonly webhooks: WebhooksService,
  ) {}

  @Post('payment-request')
  @ApiOperation({ summary: 'Génère une demande de paiement (QR SVG + URL)' })
  paymentRequest(
    @Body() dto: { merchantId: string; amountMinor: number; currency: string; reference: string },
  ) {
    return this.merchants.createPaymentRequest(dto.merchantId, dto);
  }

  @Get('me/stats')
  @ApiOperation({ summary: 'Volumes encaissés par période' })
  stats(
    @Query('merchantId') merchantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.merchants.stats(merchantId, from, to);
  }

  @Get('payment-requests/:id')
  @ApiOperation({ summary: 'Détail d’une demande de paiement' })
  get(@Param('id') id: string) {
    return this.merchants.get(id);
  }

  @Post('webhooks')
  @ApiOperation({ summary: 'Enregistre un endpoint webhook marchand' })
  registerWebhook(@Body() dto: { merchantId: string; url: string; events: string[] }) {
    return this.webhooks.register(dto);
  }

  @Get('webhooks')
  @ApiOperation({ summary: 'Liste des endpoints webhook' })
  listWebhooks(@Query('merchantId') merchantId: string) {
    return this.webhooks.list(merchantId);
  }
}
