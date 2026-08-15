import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@goursi/shared-types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtPayload } from '../common/guards/jwt-auth.guard';
import { SubmitKycDto } from './dto/kyc.dto';
import { RejectKycDto, ReviewQueryDto } from './dto/review.dto';
import { KycService } from './kyc.service';

/**
 * KYC — soumission (client), revue (COMPLIANCE_OFFICER) et file de validation.
 */
@ApiTags('kyc')
@ApiBearerAuth()
@Controller('kyc')
export class KycController {
  constructor(private readonly kyc: KycService) {}

  @Post('submit')
  @ApiOperation({ summary: 'Soumettre un dossier KYC (documents chiffrés AES-256)' })
  submit(@CurrentUser() user: JwtPayload, @Body() dto: SubmitKycDto) {
    return this.kyc.submit(user.sub, dto);
  }

  @Post(':id/approve')
  @Roles(UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: 'Approuver un dossier (COMPLIANCE_OFFICER)' })
  approve(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.kyc.approve(id, user.sub);
  }

  @Post(':id/reject')
  @Roles(UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: 'Rejeter un dossier avec raison (COMPLIANCE_OFFICER)' })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RejectKycDto,
  ) {
    return this.kyc.reject(id, user.sub, dto.reason);
  }

  @Get('queue')
  @Roles(UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: 'File de validation (PENDING par défaut, filtres + pagination)' })
  queue(@Query() query: ReviewQueryDto) {
    return this.kyc.queue({
      status: query.status,
      level: query.level,
      documentType: query.documentType,
      page: query.page ? Number(query.page) : undefined,
    });
  }

  @Get(':id')
  @Roles(UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: 'Détail d’un dossier (jamais de document en clair)' })
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.kyc.getById(id);
  }
}
