import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '../../node_modules/.prisma/kyc-client';

/**
 * PrismaService — accès base de données kyc-service (Postgres).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: ConfigService) {
    super({
      // Le client généré lit env("DATABASE_URL") en dur — on injecte l'URL au
      // runtime pour honorer KYC_DATABASE_URL (convention plateforme) avec repli.
      datasources: { db: { url: config.get<string>('env.databaseUrl') ?? '' } },
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Prisma connecté');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
