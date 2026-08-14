import { Module } from '@nestjs/common';
import {
  CHANNEL_ADAPTERS,
  NotificationChannelAdapter,
} from './channel.interface';
import { ChannelRegistry } from './channel-registry.service';
import { SmsChannel } from './sms.channel';
import { EmailChannel } from './email.channel';
import { PushChannel } from './push.channel';
import { WhatsAppChannel } from './whatsapp.channel';

@Module({
  providers: [
    SmsChannel,
    EmailChannel,
    PushChannel,
    WhatsAppChannel,
    {
      provide: CHANNEL_ADAPTERS,
      useFactory: (
        sms: SmsChannel,
        email: EmailChannel,
        push: PushChannel,
        whatsapp: WhatsAppChannel,
      ): NotificationChannelAdapter[] => [sms, email, push, whatsapp],
      inject: [SmsChannel, EmailChannel, PushChannel, WhatsAppChannel],
    },
    ChannelRegistry,
  ],
  exports: [ChannelRegistry],
})
export class ChannelsModule {}
