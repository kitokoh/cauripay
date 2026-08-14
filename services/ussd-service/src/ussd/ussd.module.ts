import { Module } from '@nestjs/common';
import { UssdController } from './ussd.controller';
import { UssdService } from './ussd.service';
import { SessionStoreService } from '../session/session-store.service';
import { ApiCoreClientService } from './api-core-client.service';

@Module({
  controllers: [UssdController],
  providers: [UssdService, SessionStoreService, ApiCoreClientService],
})
export class UssdModule {}
