import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { EventsModule } from './events/events.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { validate } from './config/env.validation';
import { AmlModule } from './aml/aml.module';
import { AmlConsumer } from './consumer/aml.consumer';
import { ListScreenerService } from './aml/list-screener.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate, cache: true }),
    JwtModule.register({}),
    PrismaModule,
    EventsModule,
    HealthModule,
    AmlModule,
  ],
  providers: [AmlConsumer],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly screener: ListScreenerService) {}

  /** Fixtures de listes de sanctions au démarrage (idempotent). */
  async onModuleInit(): Promise<void> {
    await this.screener.seedFixtures();
  }
}
