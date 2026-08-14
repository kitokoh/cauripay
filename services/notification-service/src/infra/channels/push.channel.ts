import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationChannel } from '../../prisma/client';
import { ChannelError, ChannelSendPayload, NotificationChannelAdapter } from './channel.interface';

/**
 * Canal Push FCM (GOURSI-026c) : HTTP POST legacy FCM (fcm.googleapis.com/fcm/send)
 * avec FCM_SERVER_KEY. Implémentation réelle via fetch (mockable dans les tests).
 * Token appareil attendu dans data.deviceToken | data.fcmToken | data.token.
 */
@Injectable()
export class PushChannel implements NotificationChannelAdapter {
  readonly name = NotificationChannel.PUSH;
  private readonly logger = new Logger(PushChannel.name);
  private readonly fcmUrl = 'https://fcm.googleapis.com/fcm/send';
  private readonly timeoutMs = 10_000;

  constructor(private readonly config: ConfigService) {}

  async send(payload: ChannelSendPayload): Promise<void> {
    const serverKey = this.config.get<string>('env.fcmServerKey');
    if (!serverKey) {
      throw new ChannelError('FCM_SERVER_KEY non configuré', this.name);
    }

    const token =
      (payload.data?.deviceToken as string | undefined) ??
      (payload.data?.fcmToken as string | undefined) ??
      (payload.data?.token as string | undefined);
    if (!token) {
      throw new ChannelError('Token FCM manquant (data.deviceToken)', this.name);
    }

    let response: Response;
    try {
      response = await fetch(this.fcmUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `key=${serverKey}`,
        },
        body: JSON.stringify({
          to: token,
          notification: { title: payload.title, body: payload.body },
          data: {
            notificationId: payload.notificationId,
            type: payload.type,
            ...(payload.data ?? {}),
          },
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      throw new ChannelError(`FCM injoignable : ${(error as Error).message}`, this.name);
    }

    if (!response.ok) {
      throw new ChannelError(`FCM HTTP ${response.status}`, this.name);
    }
    this.logger.log(`Push FCM envoyé → ${token} (${payload.notificationId})`);
  }
}
