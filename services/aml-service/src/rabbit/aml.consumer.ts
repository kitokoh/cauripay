import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp from 'amqplib';
import { AmlService } from '../aml/aml.service';
import type { FinancialEvent } from './financial-event.types';

type ConnectionModel = Awaited<ReturnType<typeof amqp.connect>>;

const EXCHANGE = 'financial.events'; // topic (topologie infra/rabbitmq)
const QUEUE = 'q.aml.risk';
const ROUTING = 'transaction.#';

/**
 * Consumer des événements financiers (GOURSI-025a) : transaction.completed
 * (et .failed/.reversed) → analyse AML. Ack après analyse (persistée).
 * Payload invalide → DLQ sans boucle.
 */
@Injectable()
export class AmlConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AmlConsumer.name);
  private connection!: ConnectionModel;
  private channel!: amqp.Channel;
  private readonly url: string;
  private readonly dlqExchange: string;

  constructor(
    private readonly config: ConfigService,
    private readonly aml: AmlService,
  ) {
    this.url = this.config.getOrThrow<string>('RABBITMQ_URL');
    this.dlqExchange = this.config.get<string>('AML_DLQ_EXCHANGE', 'dead.letters')!;
  }

  async onModuleInit(): Promise<void> {
    this.connection = await amqp.connect(this.url);
    this.channel = await this.connection.createChannel();
    this.channel.prefetch(10);
    await this.channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    await this.channel.assertQueue(QUEUE, { durable: true });
    await this.channel.bindQueue(QUEUE, EXCHANGE, ROUTING);
    await this.channel.assertExchange(this.dlqExchange, 'topic', { durable: true });
    await this.channel.consume(QUEUE, (msg) => this.handle(msg), { noAck: false });
    this.logger.log(`Consumer actif : ${EXCHANGE} -> ${QUEUE} [${ROUTING}]`);
  }

  private async handle(msg: amqp.ConsumeMessage | null): Promise<void> {
    if (!msg) return;
    try {
      const event = JSON.parse(msg.content.toString()) as FinancialEvent;
      await this.aml.analyze(event);
      this.channel.ack(msg);
    } catch (err) {
      this.logger.error(`Payload invalide — DLQ : ${err instanceof Error ? err.message : String(err)}`);
      this.channel.publish(this.dlqExchange, 'aml.risk', msg.content, { persistent: true });
      this.channel.ack(msg);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
  }
}
