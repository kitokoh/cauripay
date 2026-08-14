import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AmlController } from './aml/aml.controller';
import { AmlService } from './aml/aml.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [AmlController],
  providers: [AmlService],
})
export class AppModule {}
