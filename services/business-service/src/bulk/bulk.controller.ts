import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BulkService } from './bulk.service';
import type { Response } from 'express';

@ApiTags('bulk')
@Controller('bulk')
export class BulkController {
  constructor(private readonly bulk: BulkService) {}

  @Post('uploads')
  @ApiOperation({ summary: 'Upload CSV — validation stricte (1000 lignes < 5 s)' })
  upload(@Body() dto: { merchantId: string; userId: string; csv: string }) {
    return this.bulk.upload(dto.merchantId, dto.userId, dto.csv);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'DRAFT → PENDING_APPROVAL' })
  submit(@Param('id') id: string, @Body() dto: { userId: string }) {
    return this.bulk.submit(id, dto.userId);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'PENDING_APPROVAL → APPROVED (checker ≠ maker)' })
  approve(@Param('id') id: string, @Body() dto: { checkerId: string }) {
    return this.bulk.approve(id, dto.checkerId);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Rejet → retour DRAFT' })
  reject(@Param('id') id: string, @Body() dto: { checkerId: string }) {
    return this.bulk.reject(id, dto.checkerId);
  }

  @Post(':id/execute')
  @ApiOperation({ summary: 'Exécute la batch (transactions enfants parentId)' })
  execute(@Param('id') id: string) {
    return this.bulk.execute(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail de la batch (statut + lignes)' })
  get(@Param('id') id: string) {
    return this.bulk.get(id);
  }

  @Get(':id/export.csv')
  @ApiOperation({ summary: 'Rapport CSV (succès/échecs par ligne)' })
  exportCsv(@Param('id') id: string, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="bulk-${id}.csv"`);
    res.send(this.bulk.exportCsv(id));
  }
}
