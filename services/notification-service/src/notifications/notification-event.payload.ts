import * as Joi from 'joi';
import { NotificationChannel, NotificationType } from '../prisma/client';

/**
 * Payload d'événement de notification (GOURSI-026a) :
 * consommé sur notification.events, rejoué sur dead.letters (failed.notification).
 */
export interface NotificationEventPayload {
  userId: string;
  type: NotificationType;
  channel?: NotificationChannel;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  /** Présent uniquement sur le message DLQ (cause de l'échec définitif). */
  lastError?: string;
}

export const NOTIFICATION_EVENT_SCHEMA = Joi.object({
  userId: Joi.string().required(),
  type: Joi.string()
    .valid(...Object.values(NotificationType))
    .required(),
  channel: Joi.string()
    .valid(...Object.values(NotificationChannel))
    .optional(),
  title: Joi.string().required(),
  body: Joi.string().required(),
  data: Joi.object().optional(),
  lastError: Joi.string().optional(),
});
