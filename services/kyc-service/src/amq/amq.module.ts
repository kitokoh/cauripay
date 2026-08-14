import { Global, Module } from '@nestjs/common';
import { KycEventsPublisher } from './kyc-events.publisher';

@Global()
@Module({
  providers: [KycEventsPublisher],
  exports: [KycEventsPublisher],
})
export class AmqModule {}
