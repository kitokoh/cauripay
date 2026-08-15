import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp from 'amqplib';

type ConnectionModel = Awaited<ReturnType<typeof amqp.connect>>;

const EXCHANGE = 'aml.events'; // topic — binding existant : aml.events -> q.api-core.aml [alert.#]

export interface AlertCreatedEvent {
  alertId: string;
  transactionId: string;
  severity: string;
  riskScore: number;
  walletIds: string[];
  freeze: boolean;
}

export interface AlertResolvedEvent {
  alertId: string;
  transactionId: string;
  resolution: 'CONFIRM' | 'FALSE_POSITIVE';
}

/**
 * Publie les événements AML (GOURSI-025d) : aml.alert.created (gel wallet
 * consommé par api-core) et aml.alert.resolved (tranche le back-office).
 */
@Injectable()
export class AmlEventPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AmlEventPublisher.name);
  private connection!: ConnectionModel;
  private channel!: amqp.Channel;
  private readonly url: string;

  constructor(private readonly config: ConfigService) {
    this.url = this.config.getOrThrow<string>('RABBITMQ_URL');
  }

  async onModuleInit(): Promise<void> {
    this.connection = await amqp.connect(this.url);
    this.channel = await this.connection.createChannel();
    await this.channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    this.logger.log(`Publisher prêt : ${EXCHANGE}`);
  }

  async publishAlertCreated(event: AlertCreatedEvent): Promise<void> {
    await this.publish('alert.created', event);
  }

  async publishAlertResolved(event: AlertResolvedEvent): Promise<void> {
    await this.publish('alert.resolved', event);
  }

  private async publish(routingKey: string, payload: unknown): Promise<void> {
    this.channel.publish(EXCHANGE, routingKey, Buffer.from(JSON.stringify(payload)), {
      persistent: true,
      contentType: 'application/json',
    });
    this.logger.log(`publié ${EXCHANGE} [${routingKey}]`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
  }
}
