import { Module } from '@nestjs/common';
import { AmqConsumer } from './aml-consumer.service';

@Module({
  providers: [AmqConsumer],
})
export class AmqModule {}
