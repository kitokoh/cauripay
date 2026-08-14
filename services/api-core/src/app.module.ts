import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/app-config.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';

/**
 * AppModule — racine d'api-core.
 *
 * Blocs à venir (G2) : guards JWT Keycloak (GOURSI-020b), interceptor enveloppe
 * (GOURSI-020c), Swagger (GOURSI-020d), auth (GOURSI-021*), transactions (GOURSI-023*),
 * LedgerClient (GOURSI-022*), consumers KYC/AML (GOURSI-024/025).
 */
@Module({
  imports: [AppConfigModule, PrismaModule, HealthModule],
})
export class AppModule {}
