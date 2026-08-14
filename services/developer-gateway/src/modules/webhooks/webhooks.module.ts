import { Module } from '@nestjs/common';
import { AmqModule } from '../../amq/amq.module';
import { WebhooksService, DefaultWebhookSender } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';

@Module({
  imports: [AmqModule],
  controllers: [WebhooksController],
  providers: [WebhooksService, DefaultWebhookSender],
  exports: [WebhooksService],
})
export class WebhooksModule {}
