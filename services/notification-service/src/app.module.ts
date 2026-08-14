import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthController } from './health.controller';
import { envValidationSchema, default as envConfig } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { ChannelsModule } from './infra/channels/channels.module';
import { AmqModule } from './amq/amq.module';
import { NotificationsModule } from './notifications/notifications.module';
import { EnvelopeInterceptor } from './common/interceptors/envelope.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [envConfig],
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: true, allowUnknown: true },
    }),
    ScheduleModule.forRoot(),
    JwtModule.register({ global: true }),
    PrismaModule,
    ChannelsModule,
    AmqModule,
    NotificationsModule,
  ],
  controllers: [HealthController],
  providers: [
    // Globales (pattern api-core) : enveloppe de réponse, filtre d'erreurs, RBAC
    { provide: APP_INTERCEPTOR, useClass: EnvelopeInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
