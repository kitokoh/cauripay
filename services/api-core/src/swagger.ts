import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * Swagger (GOURSI-020d) — documentation interactive sur /api/v1/docs.
 * Tags : auth, payments, health (+ les blocs G2 à venir).
 */
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('api-core — GOURSI')
    .setDescription(
      'API publique de la plateforme wallet GOURSI : auth (JWT Keycloak RS256), transactions, wallets.',
    )
    .setVersion('0.1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'keycloak-jwt',
    )
    .addTag('health', 'Liveness & readiness')
    .addTag('auth', 'Inscription, connexion, OTP, MPIN')
    .addTag('payments', 'Transactions et wallets (via ledger)')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/v1/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });
}
