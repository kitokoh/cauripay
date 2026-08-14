import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

export type ReportStatus = 'BALANCED' | 'UNBALANCED';

export interface WalletLine {
  walletId: string;
  computed: number; // SUM(CREDIT) - SUM(DEBIT)
  stored: number; // solde stocké
  delta: number;
}

export interface ReconciliationReport {
  id: string;
  date: string; // YYYY-MM-DD
  status: ReportStatus;
  totalCredit: number;
  totalDebit: number;
  delta: number;
  lines: WalletLine[];
  createdAt: Date;
}

export interface LedgerSnapshotSource {
  /** walletId → { computed, stored } fourni par le ledger (vue audit). */
  walletTotals(): Promise<Array<{ walletId: string; computed: number; stored: number }>>;
}

/**
 * reconciliation-service — équilibre comptable journalier COBAC :
 * SUM(CREDIT) - SUM(DEBIT) doit égaler le solde stocké (delta = 0).
 * Cron 3 h du matin ; écart → statut UNBALANCED + alerte (notification.events).
 */
@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger('ReconciliationService');
  private readonly reports = new Map<string, ReconciliationReport>();

  constructor(private readonly source: LedgerSnapshotSource) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async runDaily() {
    const report = await this.generate(new Date().toISOString().slice(0, 10));
    this.logger.log(`Reconciliation ${report.date} : ${report.status} (delta=${report.delta})`);
    if (report.status === 'UNBALANCED') {
      // alerte → notification.events (voir GOURSI-026a)
      this.logger.error(`ÉCART COMPTABLE détecté le ${report.date} : delta=${report.delta}`);
    }
    return report;
  }

  /** Génère (ou rejoue) le rapport d'une journée. */
  async generate(date: string): Promise<ReconciliationReport> {
    const totals = await this.source.walletTotals();
    const lines: WalletLine[] = totals.map((t) => ({
      walletId: t.walletId,
      computed: t.computed,
      stored: t.stored,
      delta: t.computed - t.stored,
    }));
    const totalCredit = lines.reduce((a, l) => a + Math.max(l.computed, 0), 0);
    const totalDebit = lines.reduce((a, l) => a + Math.max(-l.computed, 0), 0);
    const delta = lines.reduce((a, l) => a + l.delta, 0);

    const report: ReconciliationReport = {
      id: `rec_${date.replace(/-/g, '')}`,
      date,
      status: delta === 0 ? 'BALANCED' : 'UNBALANCED',
      totalCredit,
      totalDebit,
      delta,
      lines,
      createdAt: new Date(),
    };
    this.reports.set(report.id, report);
    return report;
  }

  get(date: string): ReconciliationReport | undefined {
    return this.reports.get(`rec_${date.replace(/-/g, '')}`);
  }

  /** Export CSV — détail par wallet (computed, stored, delta). */
  exportCsv(date: string): string {
    const r = this.require(date);
    const header = 'walletId,computed,stored,delta';
    const rows = r.lines.map((l) => [l.walletId, l.computed, l.stored, l.delta].join(','));
    return [header, ...rows].join('\n');
  }

  /** Export PDF — synthèse journalière (en-tête société). */
  exportPdf(date: string): string {
    const r = this.require(date);
    return [
      'CAURIPAY — Rapport de réconciliation',
      `Date : ${r.date}`,
      `Statut : ${r.status}`,
      `Total crédit : ${r.totalCredit}`,
      `Total débit : ${r.totalDebit}`,
      `Delta : ${r.delta}`,
      `Wallets contrôlés : ${r.lines.length}`,
    ].join('\n');
  }

  private require(date: string): ReconciliationReport {
    const r = this.get(date);
    if (!r) throw new Error(`Aucun rapport pour ${date}`);
    return r;
  }
}
