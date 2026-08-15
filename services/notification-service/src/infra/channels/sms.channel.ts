import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationChannel } from '../../prisma/client';
import { ChannelError, ChannelSendPayload, NotificationChannelAdapter } from './channel.interface';

/**
 * Canal SMS (GOURSI-026b) : HTTP POST vers SMS_PROVIDER_URL avec SMS_API_KEY.
 * Implémentation réelle via fetch (mockable dans les tests : jest.spyOn(global, 'fetch')).
 * Le corps envoyé : { to, message, type } — générique provider (Twilio/Vonage/generic).
 */
@Injectable()
export class SmsChannel implements NotificationChannelAdapter {
  readonly name = NotificationChannel.SMS;
  private readonly logger = new Logger(SmsChannel.name);
  private readonly timeoutMs = 10_000;

  constructor(private readonly config: ConfigService) {}

  async send(payload: ChannelSendPayload): Promise<void> {
    const providerUrl = this.config.get<string>('env.smsProviderUrl');
    const apiKey = this.config.get<string>('env.smsApiKey');
    if (!providerUrl) {
      throw new ChannelError('SMS_PROVIDER_URL non configuré', this.name);
    }

    const to = (payload.data?.phone as string | undefined) ?? payload.userId;
    let response: Response;
    try {
      response = await fetch(providerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'X-Api-Key': apiKey } : {}),
        },
        body: JSON.stringify({ to, message: payload.body, type: payload.type }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      throw new ChannelError(`SMS provider injoignable : ${(error as Error).message}`, this.name);
    }

    if (!response.ok) {
      throw new ChannelError(`SMS provider HTTP ${response.status}`, this.name);
    }
    this.logger.log(`SMS envoyé → ${to} (${payload.notificationId})`);
  }
}
