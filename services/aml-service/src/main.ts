import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const config = new DocumentBuilder()
    .setTitle('CauriPay aml-service')
    .setDescription('Scoring de risque, listes OFAC/ONU/GABAC, alertes, gel wallet')
    .setVersion('0.1.0')
    .build();
  SwaggerModule.setup('api/v1/docs', app, SwaggerModule.createDocument(app, config));
  const port = Number(process.env.AML_PORT ?? 3003);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`aml-service démarré sur http://localhost:${port}/api/v1`);
}
void bootstrap();
