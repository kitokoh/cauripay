import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { PrismaService } from './prisma/prisma.service';

describe('AppModule (GOURSI-020a)', () => {
  it('se compile avec une configuration valide (Prisma mocké — pas de base en CI)', async () => {
    // ConfigModule.forRoot valide AU CHARGEMENT du module — poser l'env AVANT l'import dynamique.
    process.env.DATABASE_URL = 'postgresql://goursi:pass@localhost:5432/goursi_api_core';
    process.env.INTERNAL_SERVICE_KEY = 'dev-key';
    process.env.JWT_ISSUER = 'http://keycloak:8080/realms/goursi';
    process.env.JWKS_URL = 'http://keycloak:8080/realms/goursi/protocol/openid-connect/certs';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.RABBITMQ_URL = 'amqp://localhost:5672';
    process.env.API_CORE_PORT = '3000';

    const { AppModule } = await import('./app.module');

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn().mockResolvedValue(undefined),
        $disconnect: jest.fn().mockResolvedValue(undefined),
      })
      .compile();

    expect(moduleRef).toBeDefined();
    await moduleRef.close();
  });
});
