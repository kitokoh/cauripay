import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UssdController } from './ussd/ussd.controller';
import { UssdEngine } from './ussd/ussd.engine';
import { UssdSessionStore } from './ussd/ussd-session.store';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [UssdController],
  providers: [UssdEngine, UssdSessionStore],
})
export class AppModule {}
