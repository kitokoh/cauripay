import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { HealthController } from './health.controller';
import { envValidationSchema, default as envConfig } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './prisma/redis.module';
import { AmqModule } from './amq/amq.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { RateLimitModule } from './modules/rate-limit/rate-limit.module';
import { RateLimitInterceptor } from './modules/rate-limit/rate-limit.interceptor';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { SandboxModule } from './modules/sandbox/sandbox.module';
import { EnvelopeInterceptor } from './common/interceptors/envelope.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

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
    AmqModule,
    ApiKeysModule,
    RateLimitModule,
    WebhooksModule,
    SandboxModule,
  ],
  controllers: [HealthController],
  providers: [
    // Globales, dans l'ordre : rate limit → enveloppe → filtre d'erreurs → JWT → RBAC
    { provide: APP_INTERCEPTOR, useClass: RateLimitInterceptor },
    { provide: APP_INTERCEPTOR, useClass: EnvelopeInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
