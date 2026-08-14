import { Injectable, Logger } from '@nestjs/common';
import { Notification, NotificationStatus } from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ChannelRegistry } from '../infra/channels/channel-registry.service';
import { BackoffService, MAX_ATTEMPTS } from './backoff.service';
import { RabbitMqPublisher } from '../amq/rabbitmq-publisher.service';

/**
 * Cœur du cycle de vie (GOURSI-026a/d) :
 * 1. Résolution du canal via ChannelRegistry (canal inconnu → FAILED immédiat).
 * 2. send() via l'adaptateur → SENT + deliveredAt.
 * 3. Échec → attempts+1, nextRetryAt = now + backoff(attempts) (PENDING, rejoué par le cron).
 * 4. 4e échec → FAILED + republish vers dead.letters (routing failed.notification).
 */
@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: ChannelRegistry,
    private readonly backoff: BackoffService,
    private readonly publisher: RabbitMqPublisher,
  ) {}

  async dispatchNotification(notification: Notification): Promise<void> {
    const adapter = this.registry.get(notification.channel);
    if (!adapter) {
      // Canal inconnu : échec définitif, sans retry ni DLQ (config à corriger côté producteur).
      this.logger.warn(
        `Canal inconnu "${notification.channel}" — notification ${notification.id} → FAILED`,
      );
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { status: NotificationStatus.FAILED, lastError: `Canal inconnu : ${notification.channel}` },
      });
      return;
    }

    try {
      await adapter.send({
        notificationId: notification.id,
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        data: (notification.data as Record<string, unknown> | null) ?? undefined,
      });
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { status: NotificationStatus.SENT, deliveredAt: new Date(), lastError: null },
      });
    } catch (error) {
      const attempts = notification.attempts + 1;
      const errorMessage = (error as Error).message ?? String(error);
      this.logger.error(
        `Notification ${notification.id} — échec canal ${notification.channel} : ${errorMessage}`,
      );

      if (attempts >= MAX_ATTEMPTS) {
        this.logger.error(`Notification ${notification.id} — ${attempts} tentatives échouées → FAILED + DLQ`);
        await this.prisma.notification.update({
          where: { id: notification.id },
          data: { status: NotificationStatus.FAILED, attempts, lastError: errorMessage },
        });
        await this.publisher.publishFailedNotification({
          userId: notification.userId,
          type: notification.type,
          channel: notification.channel,
          title: notification.title,
          body: notification.body,
          data: (notification.data as Record<string, unknown> | undefined) ?? undefined,
          lastError: errorMessage,
        });
      } else {
        const nextRetryAt = new Date(Date.now() + this.backoff.getDelayMs(attempts));
        await this.prisma.notification.update({
          where: { id: notification.id },
          data: {
            status: NotificationStatus.PENDING,
            attempts,
            nextRetryAt,
            lastError: errorMessage,
          },
        });
      }
    }
  }
}
