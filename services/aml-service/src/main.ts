import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

/**
 * aml-service — point d'entrée (GOURSI-025a). Port 3040 (ADR-004).
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: process.env.LOG_LEVEL === 'debug' ? ['log', 'error', 'warn', 'debug', 'verbose'] : ['log', 'error', 'warn'],
  });
  const config = app.get(ConfigService);

  app.use(helmet());
  app.enableCors({ origin: false });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = config.getOrThrow<number>('PORT');
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`aml-service démarré sur http://localhost:${port} (health : /health)`);
}

void bootstrap();
