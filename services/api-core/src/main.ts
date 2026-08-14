import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { setupSwagger } from './swagger';

/**
 * Bootstrap api-core :
 * - préfixe global /api/v1 ;
 * - ValidationPipe global (whitelist + transformation) ;
 * - enveloppe de réponse + exception filter + requestId (GOURSI-020c) ;
 * - Swagger sur /api/v1/docs (GOURSI-020d) ;
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
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  setupSwagger(app);

  const port = Number(process.env.API_CORE_PORT ?? 3000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`api-core démarré sur http://localhost:${port}/api/v1 — docs: /api/v1/docs — health: /api/v1/health`);
}

void bootstrap();
