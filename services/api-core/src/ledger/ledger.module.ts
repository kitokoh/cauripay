import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { LedgerClientService } from './ledger-client.service';
import { LedgerController } from './ledger.controller';

@Module({
  imports: [HttpModule],
  providers: [LedgerClientService],
  controllers: [LedgerController],
  exports: [LedgerClientService],
})
export class LedgerModule {}
