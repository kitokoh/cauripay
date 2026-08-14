import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

/** Bootstrap aml-service (GOURSI-024a) : port 3040 (ADR-004), ValidationPipe global. */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  const port = Number(process.env.AML_PORT ?? 3040);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`aml-service démarré sur http://localhost:${port}/api/v1 — health: /api/v1/health`);
}

void bootstrap();
