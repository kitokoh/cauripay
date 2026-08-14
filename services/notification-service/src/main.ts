import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Swagger : GET /api/v1/docs
  const config = new DocumentBuilder()
    .setTitle('notification-service GOURSI')
    .setDescription(
      'Notifications : canaux SMS / Email / Push FCM / WhatsApp — consumer RabbitMQ (notification.events), retry/backoff + DLQ (GOURSI-026)',
    )
    .setVersion('0.2.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'X-Service-Key', in: 'header' }, 'X-Service-Key')
    .build();
  SwaggerModule.setup('api/v1/docs', app, SwaggerModule.createDocument(app, config));

  const port = Number(process.env.NOTIFICATION_PORT ?? 3050);
  await app.listen(port);
  logger.log(`notification-service prêt sur :${port} — docs /api/v1/docs`);
}

void bootstrap();
