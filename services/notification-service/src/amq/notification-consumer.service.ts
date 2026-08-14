import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp, { ChannelWrapper } from 'amqp-connection-manager';
import type { Channel, ConsumeMessage } from 'amqplib';
import { NotificationChannel, NotificationStatus, NotificationType, Prisma } from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DispatchService } from '../notifications/dispatch.service';
import { NOTIFICATION_EVENT_SCHEMA, NotificationEventPayload } from '../notifications/notification-event.payload';

export const NOTIFICATION_EXCHANGE = 'notification.events';
export const NOTIFICATION_QUEUE = 'q.notification.dispatch';

/**
 * Consumer RabbitMQ (GOURSI-026a) : notification.events (fanout) → q.notification.dispatch.
 * Chaque message : persistance Notification PENDING → dispatch immédiat via les canaux.
 * Le message est ACK après traitement (règle GOURSI-026d : jamais de reject sans tentative de canal ;
 * les échecs passent par retry/backoff en base puis DLQ après 4 tentatives).
 */
@Injectable()
export class NotificationConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationConsumer.name);
  private connection?: ReturnType<typeof amqp.connect>;
  private channel?: ChannelWrapper;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly dispatch: DispatchService,
  ) {}

  async onModuleInit(): Promise<void> {
    const url = this.config.get<string>('env.rabbitmqUrl')!;
    this.connection = amqp.connect([url]);
    this.channel = this.connection.createChannel({
      json: true,
      setup: (ch: Channel) =>
        ch
          .assertQueue(NOTIFICATION_QUEUE, { durable: true })
          .then(() => ch.bindQueue(NOTIFICATION_QUEUE, NOTIFICATION_EXCHANGE, '')),
    });

    await this.channel.addSetup(async (ch: Channel) => {
      await ch.consume(NOTIFICATION_QUEUE, (msg: ConsumeMessage | null) => {
        if (!msg) return;
        void this.handleMessage(msg.content.toString())
          .catch((error: unknown) =>
            this.logger.error('Erreur traitement notification', (error as Error).message),
          )
          .finally(() => ch.ack(msg));
      });
    });
    this.logger.log(`Consumer ${NOTIFICATION_EXCHANGE} actif (queue ${NOTIFICATION_QUEUE})`);
  }

  /**
   * Traite un message brut : validation Joi → persistance PENDING → dispatch.
   * Payload invalide / non-JSON : loggé puis ACK (rien à persister).
   */
  async handleMessage(raw: string): Promise<void> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      this.logger.warn('Payload de notification non-JSON, ignoré');
      return;
    }

    const { error, value } = NOTIFICATION_EVENT_SCHEMA.validate(parsed, { abortEarly: false });
    if (error) {
      this.logger.warn(`Payload de notification invalide, ignoré : ${error.message}`);
      return;
    }
    const payload = value as NotificationEventPayload;
    if (!payload.channel) {
      // channel requis en persistance : événement malformé, on ne peut pas dispatcher.
      this.logger.warn(`Notification sans channel (userId=${payload.userId}), ignorée`);
      return;
    }

    const notification = await this.prisma.notification.create({
      data: {
        userId: payload.userId,
        type: payload.type as NotificationType,
        channel: payload.channel as NotificationChannel,
        title: payload.title,
        body: payload.body,
        status: NotificationStatus.PENDING,
        ...(payload.data !== undefined
          ? { data: payload.data as Prisma.InputJsonValue }
          : {}),
      },
    });

    await this.dispatch.dispatchNotification(notification);
  }

  async onModuleDestroy(): Promise<void> {
    await this.connection?.close();
  }
}
