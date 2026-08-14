import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AmlService, Alert } from './aml.service';

@ApiTags('aml')
@Controller('aml')
export class AmlController {
  constructor(private readonly aml: AmlService) {}

  @Post('score')
  @ApiOperation({ summary: 'Score de risque (0-100, seuil 70 → alerte)' })
  score(
    @Body()
    dto: {
      userId: string;
      fullName: string;
      country: string;
      transactionVolumeMinor: number;
    },
  ) {
    return this.aml.scoreUser(dto);
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Liste des alertes (filtre par statut)' })
  list(@Query('status') status?: Alert['status']) {
    return this.aml.listAlerts(status);
  }

  @Post('alerts/:alertId/review')
  @ApiOperation({ summary: 'Passer en REVIEW' })
  review(@Param('alertId') alertId: string, @Body() dto: { reviewerId: string }) {
    return this.aml.updateAlert(alertId, 'review', dto.reviewerId);
  }

  @Post('alerts/:alertId/confirm')
  @ApiOperation({ summary: 'Confirmer (→ gel wallet via aml.events)' })
  confirm(@Param('alertId') alertId: string, @Body() dto: { reviewerId: string }) {
    return this.aml.updateAlert(alertId, 'confirm', dto.reviewerId);
  }

  @Post('alerts/:alertId/false-positive')
  @ApiOperation({ summary: 'Marquer faux positif' })
  falsePositive(@Param('alertId') alertId: string, @Body() dto: { reviewerId: string }) {
    return this.aml.updateAlert(alertId, 'false_positive', dto.reviewerId);
  }
}
