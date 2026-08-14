import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { NotificationService } from './notification.service';

/**
 * Consumer RabbitMQ — écoute notification.events (fanout).
 * Consomme les événements financiers/KYC/AML et émet les notifications.
 * En phase 0 : déclaration directe des queues (topologie GOURSI-RMQ1).
 */
@Injectable()
export class NotificationConsumer implements OnModuleInit {
  private readonly logger = new Logger('NotificationConsumer');
  private channel?: amqp.Channel;

  constructor(
    private readonly notifications: NotificationService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    const url = this.config.get<string>('RABBITMQ_URL') ?? 'amqp://guest:guest@localhost:5672';
    try {
      const connection = await amqp.connect(url);
      this.channel = await connection.createChannel();
      const channel = this.channel;
      await channel.assertExchange('notification.events', 'fanout', { durable: true });
      const { queue } = await channel.assertQueue('q.notification.all', { durable: true });
      await channel.bindQueue(queue, 'notification.events', '');
      await channel.consume(queue, (msg: amqp.ConsumeMessage | null) => {
        if (!msg) return;
        try {
          const event = JSON.parse(msg.content.toString());
          this.handleEvent(event);
          channel.ack(msg);
        } catch (e) {
          this.logger.error(`Événement rejeté: ${e instanceof Error ? e.message : e}`);
          channel.nack(msg, false, false); // → DLQ
        }
      });
      this.logger.log('Consumer notification.events actif');
    } catch (e) {
      this.logger.warn(`RabbitMQ indisponible au démarrage (retry au prochain cycle): ${e}`);
    }
  }

  /** Mapping événement → notification (canaux selon le type). */
  handleEvent(event: { type?: string; transactionId?: string; userId?: string }) {
    const type = event.type ?? 'unknown';
    this.notifications.send({
      userId: event.userId ?? 'system',
      channel: 'EMAIL',
      to: event.userId ? `user-${event.userId}@cauripay.test` : 'ops@cauripay.test',
      title: `Événement ${type}`,
      body: `Transaction ${event.transactionId ?? '—'} ${type}`,
    });
    this.logger.log(`Notification générée pour ${type}`);
  }
}
