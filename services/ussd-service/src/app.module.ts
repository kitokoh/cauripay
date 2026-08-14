import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { HealthController } from './health.controller';
import { envValidationSchema, default as envConfig } from './config/env.validation';
import { RedisModule } from './redis/redis.module';
import { UssdModule } from './ussd/ussd.module';
import { EnvelopeInterceptor } from './common/interceptors/envelope.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

/**
 * ussd-service (GOURSI-027) — port 3060.
 * Pas de base de données : sessions USSD dans Redis (TTL 180 s).
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [envConfig],
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: true, allowUnknown: true },
    }),
    RedisModule,
    UssdModule,
  ],
  controllers: [HealthController],
  providers: [
    // Globales : enveloppe de réponse + filtre d'erreurs plat
    { provide: APP_INTERCEPTOR, useClass: EnvelopeInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
