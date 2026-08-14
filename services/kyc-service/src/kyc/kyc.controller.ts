import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/common/jwt-auth.guard';
import { Roles } from '../auth/common/roles.decorator';
import { RolesGuard } from '../auth/common/roles.guard';
import { KycQueueQuery, RejectKycDto, SubmitKycDto } from './dto/kyc.dto';
import { KycService } from './kyc.service';

/**
 * API KYC (GOURSI-024) — port 3030, préfixe /api/v1.
 * Toute action d'officier exige le rôle Keycloak COMPLIANCE_OFFICER (403 sinon).
 */
@Controller('kyc')
export class KycController {
  constructor(private readonly kycService: KycService) {}

  /** Soumission d'un dossier (client authentifié). */
  @Post('submit')
  @UseGuards(JwtAuthGuard)
  submit(@Body() dto: SubmitKycDto, @Req() req: AuthenticatedRequest) {
    return this.kycService.submit(dto, req.user.sub);
  }

  /** File de validation — COMPLIANCE_OFFICER uniquement. */
  @Get('queue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COMPLIANCE_OFFICER')
  queue(@Query() query: KycQueueQuery) {
    return this.kycService.queue(
      query.status,
      query.level,
      query.documentType,
      query.page ? Number(query.page) : 1,
    );
  }

  /** Détail d'un dossier avec documents (officier uniquement). */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COMPLIANCE_OFFICER')
  detail(@Param('id') id: string) {
    return this.kycService.detail(id);
  }

  /** Approbation — double traitement → 409. */
  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COMPLIANCE_OFFICER')
  approve(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.kycService.approve(id, req.user.sub);
  }

  /** Rejet avec motif — double traitement → 409. */
  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COMPLIANCE_OFFICER')
  reject(@Param('id') id: string, @Body() dto: RejectKycDto, @Req() req: AuthenticatedRequest) {
    return this.kycService.reject(id, dto, req.user.sub);
  }
}
