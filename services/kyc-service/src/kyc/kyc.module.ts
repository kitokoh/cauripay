import { Module } from '@nestjs/common';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';
import { CryptoService } from './crypto.service';

@Module({
  controllers: [KycController],
  providers: [KycService, CryptoService],
  exports: [KycService],
})
export class KycModule {}
