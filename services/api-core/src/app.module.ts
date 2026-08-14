import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppConfigModule } from './config/app-config.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { RequestIdMiddleware } from './common/middlewares/request-id.middleware';

/**
 * AppModule — racine d'api-core.
 *
 * Blocs livrés : config fail-fast (GOURSI-020a), guards JWT Keycloak + rôles
 * (GOURSI-020b), enveloppe + exception filter + requêtes lentes (GOURSI-020c),
 * Swagger (GOURSI-020d), Prisma, health.
 *
 * Blocs à venir : auth (GOURSI-021*), LedgerClient (GOURSI-022*),
 * transactions (GOURSI-023*), consumers KYC/AML (GOURSI-024/025).
 */
@Module({
  imports: [AppConfigModule, PrismaModule, HealthModule, AuthModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
