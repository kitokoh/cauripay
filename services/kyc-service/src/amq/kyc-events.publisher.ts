import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Channel, ChannelModel, connect } from 'amqplib';

/**
 * Publication des événements KYC (GOURSI-024a/b) :
 * - exchange `kyc.events` (topic) : kyc.submitted / kyc.approved / kyc.rejected ;
 * - exchange `notification.events` (fanout) : alerte client lors d'un rejet.
 * Le canal est créé à la demande ; une panne RabbitMQ logge l'erreur (retry au prochain événement).
 */
@Injectable()
export class KycEventPublisher implements OnModuleDestroy {
  private readonly logger = new Logger(KycEventPublisher.name);
  private conn: ChannelModel | null = null;
  private channel: Channel | null = null;
  private readonly url: string;

  constructor(config: ConfigService) {
    this.url = config.get<string>('env.rabbitmqUrl')!;
  }

  async publish(routingKey: 'kyc.submitted' | 'kyc.approved' | 'kyc.rejected', payload: Record<string, unknown>): Promise<void> {
    try {
      const channel = await this.getChannel();
      await channel.assertExchange('kyc.events', 'topic', { durable: true });
      channel.publish('kyc.events', routingKey, Buffer.from(JSON.stringify(payload)), {
        persistent: true,
      });
      this.logger.log(`kyc.events → ${routingKey} (${String(payload.kycId ?? payload.userId)})`);
    } catch (err) {
      // Liste rouge : jamais d'exception avalée — loggé, le retry se fait au prochain appel.
      this.logger.error(`Publication kyc.events:${routingKey} impossible`, err as Error);
    }
  }

  /** Alerte client (ex. rejet) — fanout notification.events. */
  async publishNotification(type: string, payload: Record<string, unknown>): Promise<void> {
    try {
      const channel = await this.getChannel();
      await channel.assertExchange('notification.events', 'fanout', { durable: true });
      channel.publish(
        'notification.events',
        '',
        Buffer.from(JSON.stringify({ type, ...payload })),
        { persistent: true },
      );
      this.logger.log(`notification.events → ${type}`);
    } catch (err) {
      this.logger.error(`Publication notification.events:${type} impossible`, err as Error);
    }
  }

  private async getChannel(): Promise<Channel> {
    if (this.channel && this.conn) {
      return this.channel;
    }
    this.conn = await connect(this.url);
    this.channel = await this.conn.createChannel();
    return this.channel;
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.channel?.close();
      await this.conn?.close();
    } catch {
      // fermeture best-effort
    }
  }
}
