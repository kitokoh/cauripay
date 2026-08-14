import { Global, Module } from '@nestjs/common';
import { AmlConsumer } from './aml.consumer';

/** Consumer des événements financiers (démarré au boot, connexion requise — fail-fast). */
@Global()
@Module({
  providers: [AmlConsumer],
  exports: [AmlConsumer],
})
export class RabbitModule {}
