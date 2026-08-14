import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentsController } from './payments/payments.controller';
import { PaymentRouterService } from './payments/payment-router.service';
import { GoursiRailAdapter } from './payments/rails/goursi.rail-adapter';
import { RailRegistry } from '@goursi/payment-rail-contracts';
import { MerchantsController } from './merchants/merchants.controller';
import { MerchantsService } from './merchants/merchants.service';
import { WebhooksService } from './webhooks/webhooks.service';
import { BulkController } from './bulk/bulk.controller';
import { BulkService } from './bulk/bulk.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [PaymentsController, MerchantsController, BulkController],
  providers: [
    RailRegistry,
    GoursiRailAdapter,
    PaymentRouterService,
    MerchantsService,
    WebhooksService,
    BulkService,
  ],
  exports: [PaymentRouterService, WebhooksService],
})
export class AppModule {}
