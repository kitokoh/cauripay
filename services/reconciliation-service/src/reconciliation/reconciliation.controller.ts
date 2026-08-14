import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ReconciliationService } from './reconciliation.service';
import type { Response } from 'express';

@ApiTags('reports')
@Controller('reports')
export class ReconciliationController {
  constructor(private readonly reconciliation: ReconciliationService) {}

  @Get('daily')
  @ApiOperation({ summary: 'Rapport du jour (génère si absent)' })
  async daily() {
    return this.reconciliation.runDaily();
  }

  @Get('daily/:date')
  @ApiOperation({ summary: 'Rapport d’une journée précise' })
  get(@Param('date') date: string) {
    return this.reconciliation.get(date);
  }

  @Get('daily/:date/export.csv')
  @ApiOperation({ summary: 'Export CSV (détail par wallet)' })
  exportCsv(@Param('date') date: string, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="reconciliation-${date}.csv"`);
    res.send(this.reconciliation.exportCsv(date));
  }

  @Get('daily/:date/export.pdf')
  @ApiOperation({ summary: 'Export PDF (synthèse journalière)' })
  exportPdf(@Param('date') date: string, @Res() res: Response) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="reconciliation-${date}.pdf"`);
    res.send(this.reconciliation.exportPdf(date));
  }
}
