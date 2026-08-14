import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KycController } from './kyc/kyc.controller';
import { KycService } from './kyc/kyc.service';
import { DocumentCipher } from './kyc/document-cipher.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [KycController],
  providers: [KycService, DocumentCipher],
})
export class AppModule {}
