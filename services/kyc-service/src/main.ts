import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app.enableCors({ origin: process.env.CORS_ORIGINS?.split(',').filter(Boolean) ?? false });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }));

  const swagger = new DocumentBuilder()
    .setTitle('kyc-service GOURSI')
    .setDescription('Vérification d\'identité : documents chiffrés AES-256, file COMPLIANCE_OFFICER')
    .setVersion('0.2.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/v1/docs', app, SwaggerModule.createDocument(app, swagger));

  const port = Number(process.env.KYC_PORT ?? process.env.KYC_SERVICE_PORT ?? 3030);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`kyc-service prêt sur :${port} — docs /api/v1/docs`);
}

void bootstrap();
