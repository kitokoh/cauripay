import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '../../generated/kyc';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(config: ConfigService) {
    super({
      // URL injectée au runtime : honore KYC_DATABASE_URL (convention plateforme)
      // avec repli sur DATABASE_URL — le client généré lit sinon env("DATABASE_URL").
      datasources: { db: { url: config.get<string>('env.databaseUrl') ?? '' } },
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
