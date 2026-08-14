import { Module } from '@nestjs/common';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';
import { AesService } from '../crypto/aes.service';

@Module({
  controllers: [KycController],
  providers: [KycService, AesService],
  exports: [KycService],
})
export class KycModule {}
