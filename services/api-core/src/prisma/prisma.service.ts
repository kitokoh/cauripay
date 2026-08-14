import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService — accès base de données d'api-core (Postgres).
 *
 * Règles :
 * - le schéma `ledger` n'est JAMAIS touché par Prisma (Flyway uniquement, voir ADR-004) ;
 * - le client est généré par `prisma generate` (cf. package.json).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Prisma connecté');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Prisma déconnecté');
  }
}
