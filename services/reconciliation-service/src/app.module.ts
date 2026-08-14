import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ReconciliationController } from './reconciliation/reconciliation.controller';
import { ReconciliationService, LedgerSnapshotSource } from './reconciliation/reconciliation.service';

/** Source réelle : vue audit du ledger (remplacée en staging par un client HTTP). */
class LedgerAuditSource implements LedgerSnapshotSource {
  async walletTotals() {
    // En phase 0 : aucune donnée → 0 ligne → BALANCED.
    // En staging : GET /internal/ledger/audit-totals (ledger-service).
    return [];
  }
}

export const LEDGER_SNAPSHOT_SOURCE = 'LEDGER_SNAPSHOT_SOURCE';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), ScheduleModule.forRoot()],
  controllers: [ReconciliationController],
  providers: [
    { provide: LEDGER_SNAPSHOT_SOURCE, useClass: LedgerAuditSource },
    {
      provide: ReconciliationService,
      inject: [LEDGER_SNAPSHOT_SOURCE],
      useFactory: (source: LedgerSnapshotSource) => new ReconciliationService(source),
    },
  ],
})
export class AppModule {}
