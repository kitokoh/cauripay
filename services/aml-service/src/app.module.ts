import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AmlModule } from './aml/aml.module';
import { validateEnv } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { RabbitModule } from './rabbit/rabbit.module';

/**
 * aml-service — module racine (GOURSI-025). Config fail-fast au boot.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: ['../../.env', '.env'],
    }),
    PrismaModule,
    RabbitModule,
    AmlModule,
    HealthModule,
  ],
})
export class AppModule {}
