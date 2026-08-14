import { Module, forwardRef } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { DispatchService } from './dispatch.service';
import { BackoffService } from './backoff.service';
import { RetryCronService } from './retry-cron.service';
import { ChannelsModule } from '../infra/channels/channels.module';
import { AmqModule } from '../amq/amq.module';

/**
 * Module fonctionnel notifications : HTTP (lecture/test) + moteur de dispatch/retry/DLQ.
 * forwardRef : le consumer AMQP (AmqModule) dépend de DispatchService — cycle résolu.
 */
@Module({
  imports: [ChannelsModule, forwardRef(() => AmqModule)],
  controllers: [NotificationsController],
  providers: [NotificationsService, DispatchService, BackoffService, RetryCronService],
  exports: [DispatchService, BackoffService],
})
export class NotificationsModule {}
