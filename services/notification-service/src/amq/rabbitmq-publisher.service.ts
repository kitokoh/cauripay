import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp, { ChannelWrapper } from 'amqp-connection-manager';
import type { Channel } from 'amqplib';
import { NotificationEventPayload } from '../notifications/notification-event.payload';

export const DEAD_LETTERS_EXCHANGE = 'dead.letters';
export const FAILED_NOTIFICATION_ROUTING_KEY = 'failed.notification';

/**
 * Éditeur RabbitMQ (GOURSI-026d) : republish des notifications définitivement échouées
 * vers l'exchange dead.letters (routing failed.notification) — topologie déclarée infra/rabbitmq.
 */
@Injectable()
export class RabbitMqPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMqPublisher.name);
  private connection?: ReturnType<typeof amqp.connect>;
  private channel?: ChannelWrapper;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.config.get<string>('env.rabbitmqUrl')!;
    this.connection = amqp.connect([url]);
    this.channel = this.connection.createChannel({
      json: true,
      setup: (ch: Channel) =>
        ch.assertExchange(DEAD_LETTERS_EXCHANGE, 'topic', { durable: true }),
    });
    this.logger.log('Publisher dead.letters prêt');
  }

  async publishFailedNotification(payload: NotificationEventPayload): Promise<void> {
    if (!this.channel) {
      throw new Error('Publisher RabbitMQ non initialisé');
    }
    await this.channel.publish(DEAD_LETTERS_EXCHANGE, FAILED_NOTIFICATION_ROUTING_KEY, payload, {
      persistent: true,
    });
    this.logger.warn(
      `Notification → dead.letters/${FAILED_NOTIFICATION_ROUTING_KEY} (${payload.userId}/${payload.type})`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.connection?.close();
  }
}
