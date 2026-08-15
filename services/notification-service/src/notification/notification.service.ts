import { Injectable, Logger } from '@nestjs/common';

export type NotificationChannel = 'SMS' | 'EMAIL' | 'PUSH_FCM' | 'WHATSAPP';

export interface NotificationPayload {
  id: string;
  userId: string;
  channel: NotificationChannel;
  to: string; // numéro / email / device token
  title: string;
  body: string;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'DLQ';
  attempts: number;
  maxAttempts: number;
  nextRetryAt?: Date;
  lastError?: string;
  createdAt: Date;
}

/**
 * notification-service — persistance en mémoire (phase 0), canaux simulés
 * (logs). En staging : Twilio (SMS), SES/SMTP (email), FCM (push), API WhatsApp
 * Business. Retry avec backoff exponentiel puis DLQ.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger('NotificationService');
  private readonly store = new Map<string, NotificationPayload>();

  private static readonly BACKOFF_SECONDS = [1, 5, 30, 300]; // 4 tentatives

  send(
    payload: Omit<NotificationPayload, 'id' | 'status' | 'attempts' | 'maxAttempts' | 'createdAt'>,
  ): NotificationPayload {
    const record: NotificationPayload = {
      ...payload,
      id: `ntf_${globalThis.crypto.randomUUID().slice(0, 8)}`,
      status: 'PENDING',
      attempts: 0,
      maxAttempts: NotificationService.BACKOFF_SECONDS.length,
      createdAt: new Date(),
    };
    this.store.set(record.id, record);
    this.deliver(record.id);
    return record;
  }

  /** Livraison avec retry/backoff — simule un échec si le transport jette. */
  private deliver(id: string) {
    const record = this.store.get(id);
    if (!record) return;
    try {
      this.dispatch(record);
      record.status = 'SENT';
    } catch (e) {
      record.attempts += 1;
      record.lastError = e instanceof Error ? e.message : String(e);
      if (record.attempts >= record.maxAttempts) {
        record.status = 'DLQ';
        this.logger.error(
          `Notification ${id} → DLQ après ${record.attempts} tentatives: ${record.lastError}`,
        );
      } else {
        const backoff = NotificationService.BACKOFF_SECONDS[record.attempts] ?? 300;
        record.nextRetryAt = new Date(Date.now() + backoff * 1000);
        record.status = 'FAILED';
        setTimeout(() => this.deliver(id), backoff * 1000);
      }
    }
  }

  /** Transport simulé — remplacé par les vrais SDK en staging. */
  private dispatch(record: NotificationPayload) {
    switch (record.channel) {
      case 'SMS':
        this.logger.log(`[SMS→${record.to}] ${record.body}`);
        return;
      case 'EMAIL':
        this.logger.log(`[EMAIL→${record.to}] ${record.title}: ${record.body}`);
        return;
      case 'PUSH_FCM':
        this.logger.log(`[PUSH→${record.to}] ${record.title}: ${record.body}`);
        return;
      case 'WHATSAPP':
        this.logger.log(`[WA→${record.to}] ${record.body}`);
        return;
    }
  }

  get(id: string): NotificationPayload | undefined {
    return this.store.get(id);
  }

  list(userId?: string): NotificationPayload[] {
    const all = [...this.store.values()];
    return userId ? all.filter((n) => n.userId === userId) : all;
  }
}
