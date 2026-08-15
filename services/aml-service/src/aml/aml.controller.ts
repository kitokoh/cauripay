import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { IsIn, IsString, MinLength } from 'class-validator';
import { Request } from 'express';
import { AmlService } from './aml.service';
import { Roles } from '../common/guards/roles.guard';

/**
 * API back-office AML (GOURSI-025c) — réservée aux rôles compliance.
 * Accès : X-Service-Key (interne) ou JWT avec rôle COMPLIANCE_OFFICER.
 */

class ActionBody {
  @IsIn(['REVIEW', 'CONFIRM', 'FALSE_POSITIVE'])
  action!: 'REVIEW' | 'CONFIRM' | 'FALSE_POSITIVE';

  @IsString()
  @MinLength(5)
  comment!: string;
}

@Controller('aml')
export class AmlController {
  constructor(private readonly aml: AmlService) {}

  @Get('alerts')
  @Roles('COMPLIANCE_OFFICER', 'SUPER_ADMIN', 'FINANCE_MANAGER')
  list(@Query() query: Record<string, string>) {
    return this.aml.listAlerts({
      status: query.status,
      severity: query.severity,
      limit: Number(query.limit) || 50,
      before: query.before,
    });
  }

  @Post('alerts/:id/action')
  @Roles('COMPLIANCE_OFFICER', 'SUPER_ADMIN')
  async act(
    @Param('id') id: string,
    @Body() body: ActionBody,
    @Req() req: Request & { auth?: { userId?: string } },
  ) {
    if (!body.action || !['REVIEW', 'CONFIRM', 'FALSE_POSITIVE'].includes(body.action)) {
      throw new BadRequestException({ code: 'INVALID_ACTION', message: 'action doit être REVIEW | CONFIRM | FALSE_POSITIVE' });
    }
    if (!body.comment || body.comment.trim().length < 5) {
      throw new BadRequestException({ code: 'COMMENT_REQUIRED', message: 'commentaire obligatoire (min 5 caractères)' });
    }
    const updated = await this.aml.actOnAlert(id, body.action, body.comment, req.auth?.userId);
    return { alert: updated };
  }
}
