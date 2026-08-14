import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',').filter(Boolean) ?? ['http://localhost:3001', 'http://localhost:3002'],
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Swagger : GET /api/v1/docs
  const config = new DocumentBuilder()
    .setTitle('developer-gateway GOURSI')
    .setDescription('API publique développeurs : clés API, rate limiting, webhooks signés, sandbox')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/v1/docs', app, SwaggerModule.createDocument(app, config));

  const port = Number(process.env.DEV_GATEWAY_PORT ?? 3080);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`developer-gateway prêt sur :${port} — docs /api/v1/docs`);
}

void bootstrap();
