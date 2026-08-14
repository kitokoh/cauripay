import { NotificationChannel, NotificationType } from '../../prisma/client';

/** Payload transmis à un adaptateur de canal (GOURSI-026a). */
export interface ChannelSendPayload {
  notificationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/** Contrat d'adaptateur de canal : send() résout si le canal confirme, rejette sinon. */
export interface NotificationChannelAdapter {
  readonly name: NotificationChannel;
  send(payload: ChannelSendPayload): Promise<void>;
}

/** Erreur métier d'un canal (message conservé dans Notification.lastError). */
export class ChannelError extends Error {
  constructor(
    message: string,
    public readonly channel: NotificationChannel,
  ) {
    super(message);
    this.name = 'ChannelError';
  }
}

/** Token multi-provider : tous les adaptateurs enregistrés (injectés dans ChannelRegistry). */
export const CHANNEL_ADAPTERS = Symbol('CHANNEL_ADAPTERS');
