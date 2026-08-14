import { Module, forwardRef } from '@nestjs/common';
import { NotificationConsumer } from './notification-consumer.service';
import { RabbitMqPublisher } from './rabbitmq-publisher.service';
import { NotificationsModule } from '../notifications/notifications.module';

/**
 * Module AMQP (pattern api-core amq/) : consumer notification.events + publisher dead.letters.
 * forwardRef : le consumer dépend de DispatchService (NotificationsModule) et le dispatcher
 * du publisher — cycle résolu de façon idiomatique NestJS.
 */
@Module({
  imports: [forwardRef(() => NotificationsModule)],
  providers: [NotificationConsumer, RabbitMqPublisher],
  exports: [NotificationConsumer, RabbitMqPublisher],
})
export class AmqModule {}
