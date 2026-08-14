import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect, type Channel, type ChannelModel } from 'amqplib';

/**
 * Publication kyc.events (GOURSI-024a/b) : kyc.submitted / kyc.approved /
 * kyc.rejected. Best effort : un échec de publication ne fait JAMAIS échouer
 * la décision (la vérité est en base) — log + compteur.
 */
@Injectable()
export class KycEventsPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KycEventsPublisher.name);
  private readonly url: string;
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;

  constructor(config: ConfigService) {
    this.url = config.get<string>('env.rabbitmqUrl') ?? '';
  }

  async onModuleInit(): Promise<void> {
    if (!this.url) return;
    try {
      this.connection = await connect(this.url);
      this.channel = await this.connection.createChannel();
      await this.channel.assertExchange('kyc.events', 'topic', { durable: true });
    } catch (e) {
      this.logger.warn(`RabbitMQ indisponible au boot — publication différée (${(e as Error).message})`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
  }

  async publish(routingKey: string, payload: Record<string, unknown>): Promise<void> {
    if (!this.channel) return;
    try {
      this.channel.publish('kyc.events', routingKey, Buffer.from(JSON.stringify(payload)), { persistent: true });
    } catch (e) {
      this.logger.error(`Publication ${routingKey} impossible (best effort) : ${(e as Error).message}`);
    }
  }
}
