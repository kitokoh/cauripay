import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel } from '../../prisma/client';
import { ChannelSendPayload, NotificationChannelAdapter } from './channel.interface';

/**
 * Canal Email (GOURSI-026b) : STUB SMTP — log + « envoyé » en dev.
 * Interface prête : brancher un client SMTP (nodemailer) derrière send() en staging/prod.
 * Les secrets provider ne doivent jamais être en dur (env uniquement).
 */
@Injectable()
export class EmailChannel implements NotificationChannelAdapter {
  readonly name = NotificationChannel.EMAIL;
  private readonly logger = new Logger(EmailChannel.name);

  async send(payload: ChannelSendPayload): Promise<void> {
    const to = (payload.data?.email as string | undefined) ?? payload.userId;
    this.logger.log(
      `[EMAIL dev] to=${to} subject="${payload.title}" body="${payload.body}" (${payload.notificationId})`,
    );
    // STUB dev : marqué SENT — aucun SMTP requis.
  }
}
