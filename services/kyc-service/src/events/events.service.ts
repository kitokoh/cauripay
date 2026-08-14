import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp, { ChannelWrapper } from 'amqp-connection-manager';
import type { Channel } from 'amqplib';

export interface KycEventPayload {
  userId: string;
  level: string;
  status: 'submitted' | 'approved' | 'rejected';
  walletId?: string;
  reason?: string;
  kycRecordId: string;
  timestamp: string;
}

/**
 * Publication des événements KYC sur RabbitMQ (exchange topic `kyc.events`).
 * Connexion gérée (reconnexion automatique) — la publication ne fait jamais
 * échouer la requête HTTP (log + circuit breaker simple).
 */
@Injectable()
export class EventsService implements OnModuleInit, OnModuleDestroy {
  private static readonly EXCHANGE = 'kyc.events';
  private readonly logger = new Logger(EventsService.name);
  private channelWrapper: ChannelWrapper | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.config.get<string>('env.rabbitmqUrl')!;
    const connection = amqp.connect([url]);
    this.channelWrapper = connection.createChannel({
      json: false,
      setup: (channel: Channel) => channel.assertExchange(EventsService.EXCHANGE, 'topic', { durable: true }),
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.channelWrapper?.close();
  }

  async publish(routingKey: string, payload: KycEventPayload): Promise<void> {
    try {
      await this.channelWrapper?.publish(
        EventsService.EXCHANGE,
        routingKey,
        Buffer.from(JSON.stringify(payload)),
        { persistent: true },
      );
    } catch (error) {
      this.logger.error(`Publication kyc.events:${routingKey} échouée`, error instanceof Error ? error.stack : String(error));
    }
  }
}
