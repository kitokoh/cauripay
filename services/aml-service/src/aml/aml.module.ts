import { Module } from '@nestjs/common';
import { AmlController } from './aml.controller';
import { AmlService } from './aml.service';
import { RiskScorerService } from './risk-scorer.service';
import { ListScreenerService } from './list-screener.service';

@Module({
  controllers: [AmlController],
  providers: [AmlService, RiskScorerService, ListScreenerService],
  exports: [AmlService, ListScreenerService],
})
export class AmlModule {}
