import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../../node_modules/.prisma/kyc-client';

/**
 * PrismaService — accès base de données kyc-service (Postgres).
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
  }
}
