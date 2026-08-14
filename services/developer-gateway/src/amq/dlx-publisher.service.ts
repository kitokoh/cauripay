import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp, { ChannelWrapper } from 'amqp-connection-manager';
import type { Channel } from 'amqplib';

export const DLQ_EXCHANGE = 'dead.letters';
export const DLQ_ROUTING_KEY = 'failed.webhooks';

/**
 * Publication DLQ (GOURSI-026d) : après échec définitif d'un webhook
 * (4 retries backoff), l'événement est publié sur dead.letters/failed.webhooks.
 * La topologie (exchange dead.letters, queue q.dead.letters) est déclarée
 * côté infra/rabbitmq/definitions.json.
 */
@Injectable()
export class DlxPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DlxPublisher.name);
  private connection?: ReturnType<typeof amqp.connect>;
  private channel?: ChannelWrapper;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const url = this.config.get<string>('env.rabbitmqUrl')!;
    this.connection = amqp.connect([url]);
    this.channel = this.connection.createChannel({
      json: true,
      setup: (ch: Channel) =>
        ch.assertExchange(DLQ_EXCHANGE, 'topic', { durable: true }),
    });
    this.logger.log('Publisher DLQ dead.letters/failed.webhooks actif');
  }

  async publish(message: Record<string, unknown>): Promise<void> {
    if (!this.channel) {
      throw new Error('DLQ non prêt — connexion RabbitMQ absente');
    }
    await this.channel.publish(DLQ_EXCHANGE, DLQ_ROUTING_KEY, message);
  }

  async onModuleDestroy() {
    await this.connection?.close();
  }
}
