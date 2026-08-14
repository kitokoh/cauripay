import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { HealthController } from './health.controller';
import { envValidationSchema, default as envConfig } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './prisma/redis.module';
import { AuthModule } from './auth/auth.module';
import { TransactionsModule } from './transactions/transactions.module';
import { WalletsController } from './wallets/wallets.controller';
import { LedgerClientService } from './ledger-client/ledger-client.service';
import { AmqModule } from './amq/amq.module';
import { EnvelopeInterceptor } from './common/interceptors/envelope.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { RolesGuard } from './common/guards/roles.guard';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [envConfig],
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: true, allowUnknown: true },
    }),
    JwtModule.register({ global: true }),
    PrismaModule,
    RedisModule,
    AuthModule,
    TransactionsModule,
    AmqModule,
  ],
  controllers: [HealthController, WalletsController],
  providers: [
    LedgerClientService,
    // Globales : enveloppe de réponse, filtre d'erreurs, RBAC
    { provide: APP_INTERCEPTOR, useClass: EnvelopeInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    // Ordre critique : JwtAuthGuard global AVANT RolesGuard (sinon user non peuplé → 403 systématique)
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
