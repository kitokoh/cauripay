import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest } from '../common/guards/jwt-auth.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { KycService, KycView } from './kyc.service';
import { KycQueueQuery, RejectKycDto, SubmitKycDto } from './dto/kyc.dto';
import { KycStatus } from '../../generated/kyc';

const COMPLIANCE_OFFICER = 'COMPLIANCE_OFFICER';

@Controller('kyc')
@UseGuards(JwtAuthGuard, RolesGuard)
export class KycController {
  constructor(private readonly kyc: KycService) {}

  /** Dépôt d'un dossier (client authentifié). */
  @Post('submit')
  async submit(@Req() req: AuthenticatedRequest, @Body() dto: SubmitKycDto): Promise<KycView> {
    return this.kyc.submit(req.user.sub, dto);
  }

  /** File de validation — COMPLIANCE_OFFICER uniquement (403 sinon). */
  @Get('queue')
  @Roles(COMPLIANCE_OFFICER)
  async queue(@Query() q: KycQueueQuery) {
    return this.kyc.queue({
      status: q.page === 'all' ? undefined : KycStatus.PENDING,
      level: q.level,
      documentType: q.documentType,
      from: q.from,
      page: q.page && q.page !== 'all' ? Number(q.page) : 1,
    });
  }

  @Post(':id/approve')
  @Roles(COMPLIANCE_OFFICER)
  async approve(@Req() req: AuthenticatedRequest, @Param('id') id: string): Promise<KycView> {
    return this.kyc.approve(id, req.user.sub);
  }

  @Post(':id/reject')
  @Roles(COMPLIANCE_OFFICER)
  async reject(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: RejectKycDto): Promise<KycView> {
    return this.kyc.reject(id, req.user.sub, dto);
  }
}
