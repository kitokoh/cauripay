import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel } from '../../prisma/client';
import { ChannelSendPayload, NotificationChannelAdapter } from './channel.interface';

/**
 * Canal WhatsApp (GOURSI-026c) : STUB — log + « envoyé » en dev.
 * Interface prête : brancher l'API WhatsApp Business (templates approuvés uniquement en prod).
 */
@Injectable()
export class WhatsAppChannel implements NotificationChannelAdapter {
  readonly name = NotificationChannel.WHATSAPP;
  private readonly logger = new Logger(WhatsAppChannel.name);

  async send(payload: ChannelSendPayload): Promise<void> {
    const to = (payload.data?.phone as string | undefined) ?? payload.userId;
    this.logger.log(
      `[WHATSAPP dev] to=${to} template="${payload.title}" body="${payload.body}" (${payload.notificationId})`,
    );
    // STUB dev : marqué SENT — aucune dépendance WhatsApp Business.
  }
}
