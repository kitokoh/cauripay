import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { KycService } from './kyc.service';
import { KycLevel } from '@cauripay/shared-types';

@ApiTags('kyc')
@Controller('kyc')
export class KycController {
  constructor(private readonly kyc: KycService) {}

  @Post('submit')
  @ApiOperation({ summary: 'Dépose un dossier KYC (documents chiffrés AES-256)' })
  submit(
    @Body('userId') userId: string,
    @Body() dto: { userId: string; documents: Array<{ type: string; content: string }> },
  ) {
    return this.kyc.submit(dto.userId, dto);
  }

  @Post(':userId/approve')
  @ApiOperation({ summary: 'Approuve un dossier (COMPLIANCE_OFFICER)' })
  approve(
    @Param('userId') userId: string,
    @Body() dto: { reviewerId: string; targetLevel?: KycLevel },
  ) {
    return this.kyc.approve(userId, dto.reviewerId, dto.targetLevel);
  }

  @Post(':userId/reject')
  @ApiOperation({ summary: 'Rejette un dossier (motif)' })
  reject(@Param('userId') userId: string, @Body() dto: { reviewerId: string; reason: string }) {
    return this.kyc.reject(userId, dto.reviewerId, dto.reason);
  }

  @Get('pending')
  @ApiOperation({ summary: 'File de validation (COMPLIANCE_OFFICER)' })
  pending() {
    return this.kyc.pending();
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Statut d’un dossier' })
  get(@Param('userId') userId: string) {
    return this.kyc.get(userId);
  }
}
