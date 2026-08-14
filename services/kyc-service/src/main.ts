import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

/** Bootstrap kyc-service (GOURSI-024a) : port 3030 (ADR-004), ValidationPipe global. */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  const port = Number(process.env.KYC_PORT ?? 3030);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`kyc-service démarré sur http://localhost:${port}/api/v1 — health: /api/v1/health`);
}

void bootstrap();
