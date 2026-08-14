import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../../node_modules/.prisma/developer-gateway-client';

/**
 * PrismaService — accès Postgres developer-gateway (client généré dédié,
 * pattern kyc-service : ne jamais écraser le client par défaut d'api-core).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
