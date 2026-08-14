import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { JwtVerifierService } from './jwt-verifier.service';

/**
 * AuthModule — guards GLOBAUX (JWT Keycloak RS256 + rôles) et service de vérification.
 * L'ordre d'application des guards globaux suit l'ordre de déclaration des providers.
 */
@Module({
  providers: [
    JwtVerifierService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [JwtVerifierService],
})
export class AuthModule {}
