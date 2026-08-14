import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validate } from './env.validation';

/**
 * ConfigModule — global, avec validation fail-fast au démarrage.
 */
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      validate,
    }),
  ],
})
export class AppConfigModule {}
