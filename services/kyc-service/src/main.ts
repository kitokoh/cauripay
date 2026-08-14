import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }),
  );

  // Swagger : GET /api/v1/docs
  const config = new DocumentBuilder()
    .setTitle('GOURSI kyc-service')
    .setDescription('Dossiers KYC : soumission chiffrée, workflow compliance, file de validation')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/v1/docs', app, SwaggerModule.createDocument(app, config));

  const port = Number(process.env.KYC_PORT ?? 3030);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`kyc-service prêt sur :${port} — docs /api/v1/docs`);
}

void bootstrap();
