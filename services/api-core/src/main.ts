import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

/**
 * Bootstrap api-core (GOURSI-020a) :
 * - préfixe global /api/v1 ;
 * - ValidationPipe global (whitelist + transformation) ;
 * - port API_CORE_PORT (défaut 3000, convention ADR-004).
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  const port = Number(process.env.API_CORE_PORT ?? 3000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`api-core démarré sur http://localhost:${port}/api/v1 — health: /api/v1/health`);
}

void bootstrap();
