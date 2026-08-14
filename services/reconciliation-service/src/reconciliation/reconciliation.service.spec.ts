import { ReconciliationService } from './reconciliation.service';
import type { LedgerSnapshotSource } from './reconciliation.service';

describe('ReconciliationService', () => {
  let service: ReconciliationService;

  const makeSource = (data: Array<{ walletId: string; computed: number; stored: number }>): LedgerSnapshotSource => ({
    walletTotals: () => Promise.resolve(data),
  });

  it('marque BALANCED une journée équilibrée', async () => {
    service = new ReconciliationService(makeSource([
      { walletId: 'w1', computed: 1000, stored: 1000 },
      { walletId: 'w2', computed: -400, stored: -400 },
    ]));
    const r = await service.generate('2026-08-14');
    expect(r.status).toBe('BALANCED');
    expect(r.delta).toBe(0);
  });

  it('détecte UNBALANCED avec delta exact', async () => {
    service = new ReconciliationService(makeSource([
      { walletId: 'w1', computed: 1000, stored: 950 }, // écart de 50
    ]));
    const r = await service.generate('2026-08-13');
    expect(r.status).toBe('UNBALANCED');
    expect(r.delta).toBe(50);
    expect(r.lines[0]?.delta).toBe(50);
  });

  it('exporte un CSV détaillé par wallet', async () => {
    service = new ReconciliationService(makeSource([
      { walletId: 'w1', computed: 1000, stored: 1000 },
    ]));
    await service.generate('2026-08-12');
    const csv = service.exportCsv('2026-08-12');
    expect(csv).toContain('walletId,computed,stored,delta');
    expect(csv).toContain('w1,1000,1000,0');
  });

  it('exporte un PDF de synthèse', async () => {
    service = new ReconciliationService(makeSource([
      { walletId: 'w1', computed: 500, stored: 500 },
    ]));
    await service.generate('2026-08-11');
    const pdf = service.exportPdf('2026-08-11');
    expect(pdf).toContain('CAURIPAY — Rapport de réconciliation');
    expect(pdf).toContain('Statut : BALANCED');
  });
});
