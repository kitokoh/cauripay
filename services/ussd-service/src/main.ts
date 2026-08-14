import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
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
    .setTitle('ussd-service GOURSI')
    .setDescription('Menus USSD *100# — sessions Redis (TTL 180 s), i18n FR+AR, 4 opérations (solde, envoi, facture, retrait)')
    .setVersion('0.1.0')
    .build();
  SwaggerModule.setup('api/v1/docs', app, SwaggerModule.createDocument(app, config));

  const port = Number(process.env.USSD_PORT ?? 3060);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`ussd-service prêt sur :${port} — docs /api/v1/docs`);
}

void bootstrap();
