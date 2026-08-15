import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuditTrailService, AuditAction } from './audit-trail.service';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@goursi/shared-types';

/** Endpoints d'audit (réservés COMPLIANCE_OFFICER / SUPER_ADMIN). */
@ApiTags('audit')
@Controller('internal/audit')
export class AuditController {
  constructor(private readonly audit: AuditTrailService) {}

  @Post('record')
  @Roles(UserRole.COMPLIANCE_OFFICER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Enregistre une action sensible (audit trail)' })
  record(
    @Body()
    dto: {
      action: AuditAction;
      actorId: string;
      actorRole?: string;
      targetType: string;
      targetId: string;
      reason?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    return this.audit.record(dto);
  }
}
