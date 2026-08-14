import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { FeesService, LimitsService } from './fees-limits.service';

@Module({
  providers: [TransactionsService, FeesService, LimitsService],
  controllers: [TransactionsController],
  exports: [TransactionsService],
})
export class TransactionsModule {}
