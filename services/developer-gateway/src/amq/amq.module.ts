import { Module } from '@nestjs/common';
import { DlxPublisher } from './dlx-publisher.service';

@Module({
  providers: [DlxPublisher],
  exports: [DlxPublisher],
})
export class AmqModule {}
