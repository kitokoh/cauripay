import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/common/jwt-auth.guard';
import { Roles } from '../auth/common/roles.decorator';
import { RolesGuard } from '../auth/common/roles.guard';
import { AlertActionDto, AlertsQuery } from './dto/aml.dto';
import { AmlService } from './aml.service';

/** API AML (GOURSI-025c) — port 3040, officiers compliance uniquement. */
@Controller('aml')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('COMPLIANCE_OFFICER')
export class AmlController {
  constructor(private readonly amlService: AmlService) {}

  @Get('alerts')
  list(@Query() query: AlertsQuery) {
    return this.amlService.listAlerts(query.status, query.severity, query.page ? Number(query.page) : 1);
  }

  @Post('alerts/:id/action')
  action(@Param('id') id: string, @Body() dto: AlertActionDto, @Req() req: AuthenticatedRequest) {
    return this.amlService.action(id, dto.action, dto.comment, req.user.sub);
  }
}
