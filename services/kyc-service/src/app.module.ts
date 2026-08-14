import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { DocumentCryptoService } from './crypto/document-crypto.service';
import { EventsModule } from './events/events.module';
import { HealthModule } from './health/health.module';
import { KycModule } from './kyc/kyc.module';
import { PrismaModule } from './prisma/prisma.module';
import { validate } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      cache: true,
    }),
    JwtModule.register({}),
    PrismaModule,
    EventsModule,
    HealthModule,
    KycModule,
  ],
  providers: [DocumentCryptoService],
})
export class AppModule {}
