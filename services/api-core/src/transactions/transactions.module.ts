import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { FeesService } from './fees.service';
import { LedgerModule } from '../ledger/ledger.module';

@Module({
  imports: [LedgerModule],
  controllers: [TransactionsController],
  providers: [TransactionsService, FeesService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
