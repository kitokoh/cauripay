import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationStatus } from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DispatchService } from './dispatch.service';

/**
 * Rejeu périodique (GOURSI-026d) : chaque minute, re-dispatche les notifications PENDING
 * dont nextRetryAt est atteint (backoff 30s/2min/10min/30min).
 */
@Injectable()
export class RetryCronService {
  private readonly logger = new Logger(RetryCronService.name);
  private readonly batchSize = 100;

  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatch: DispatchService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, { name: 'notification-retry' })
  async retryDueNotifications(): Promise<void> {
    const due = await this.prisma.notification.findMany({
      where: {
        status: NotificationStatus.PENDING,
        nextRetryAt: { lte: new Date() },
      },
      orderBy: { nextRetryAt: 'asc' },
      take: this.batchSize,
    });

    for (const notification of due) {
      try {
        await this.dispatch.dispatchNotification(notification);
      } catch (error) {
        this.logger.error(
          `Rejeu notification ${notification.id} échoué : ${(error as Error).message}`,
        );
      }
    }

    if (due.length > 0) {
      this.logger.log(`Rejeu : ${due.length} notification(s) PENDING re-dispatchee(s)`);
    }
  }
}
