import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationStatus, NotificationType } from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DispatchService } from './dispatch.service';
import { SendTestNotificationDto } from './dto/notifications.dto';

/**
 * Lecture + envoi de test (routes internes, GOURSI-026a).
 * La persistance à la consommation et les rejets sont gérés par DispatchService/RetryCronService.
 */
@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatch: DispatchService,
  ) {}

  async list(userId?: string, status?: NotificationStatus) {
    return this.prisma.notification.findMany({
      where: {
        ...(userId ? { userId } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async findOne(id: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: `Notification ${id} introuvable`,
      });
    }
    return notification;
  }

  /** POST /notifications/test : crée une notification SYSTEM et la dispatche immédiatement. */
  async sendTest(dto: SendTestNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: NotificationType.SYSTEM,
        channel: dto.channel,
        title: 'Notification de test GOURSI',
        body: 'Ceci est une notification de test — vérifiez la réception sur votre appareil.',
        data: { test: true },
      },
    });
    await this.dispatch.dispatchNotification(notification);
    return this.prisma.notification.findUniqueOrThrow({ where: { id: notification.id } });
  }
}
