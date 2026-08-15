import { Inject, Injectable } from '@nestjs/common';
import { NotificationChannel } from '../../prisma/client';
import {
  CHANNEL_ADAPTERS,
  NotificationChannelAdapter,
} from './channel.interface';

/**
 * Registre des canaux (GOURSI-026a) : résout l'adaptateur par nom de canal.
 * Un canal inconnu → get() renvoie undefined → le dispatcher marque la notification FAILED.
 */
@Injectable()
export class ChannelRegistry {
  private readonly adapters = new Map<NotificationChannel, NotificationChannelAdapter>();

  constructor(@Inject(CHANNEL_ADAPTERS) adapters: NotificationChannelAdapter[]) {
    for (const adapter of adapters) {
      this.adapters.set(adapter.name, adapter);
    }
  }

  get(channel: NotificationChannel): NotificationChannelAdapter | undefined {
    return this.adapters.get(channel);
  }

  get channels(): NotificationChannel[] {
    return [...this.adapters.keys()];
  }
}
