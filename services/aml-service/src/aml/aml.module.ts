import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AmlEventPublisher } from '../rabbit/aml-event.publisher';
import { RiskScorerService } from '../scoring/risk-scorer.service';
import { ListScreenerService } from '../screening/list-screener.service';
import { AmlController } from './aml.controller';
import { AmlService } from './aml.service';

@Module({
  controllers: [AmlController],
  providers: [
    AmlService,
    RiskScorerService,
    ListScreenerService,
    AmlEventPublisher,
    { provide: APP_GUARD, useClass: AuthGuard }, // X-Service-Key ou JWT partout
    { provide: APP_GUARD, useClass: RolesGuard }, // @Roles sur les routes back-office
  ],
  exports: [AmlService],
})
export class AmlModule {}
