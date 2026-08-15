import { describe, expect, it } from '@jest/globals';
import { AmlService } from './aml.service';
import { RiskScorerService } from '../scoring/risk-scorer.service';
import { ListScreenerService } from '../screening/list-screener.service';
import { AmlEventPublisher } from '../rabbit/aml-event.publisher';
import type { FinancialEvent } from '../rabbit/financial-event.types';

/**
 * Workflow AML (GOURSI-025a/c) — Prisma et publisher mockés :
 *  - transaction clean → aucune alerte
 *  - nom listé (exact) → alerte CRITIQUE + événement aml.alert.created (freeze)
 *  - montant élevé seul → pas d'alerte (score 20 < 70)
 *  - workflow action : commentaire requis, transitions, événement resolved
 */

function fakePrisma() {
  const created: Array<Record<string, unknown>> = [];
  const actions: Array<Record<string, unknown>> = [];
  return {
    amlAlert: {
      create: jest.fn(async (args: { data: Record<string, unknown> }) => {
        const row = { id: 'alert-1', ...args.data };
        created.push(row);
        return row;
      }),
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) =>
        created.find((a) => a.id === where.id) ?? null),
      update: jest.fn(async (args: { where: { id: string }; data: Record<string, unknown> }) => ({
        id: args.where.id,
        ...created.find((a) => a.id === args.where.id),
        ...args.data,
      })),
    },
    amlAction: { create: jest.fn(async (args: { data: Record<string, unknown> }) => { actions.push(args.data); return { id: 'act-1', ...args.data }; }) },
    $transaction: jest.fn(async (ops: unknown[]) => {
      const results = [];
      for (const op of ops as Array<{ then?: unknown }>) {
        // exécute chaque op mockée
        results.push(await (op as { then: (fn: (v: never) => unknown) => Promise<unknown> }).then((v: never) => v));
      }
      return results;
    }),
    created,
    actions,
  };
}

const publisher = {
  publishAlertCreated: jest.fn(async () => undefined),
  publishAlertResolved: jest.fn(async () => undefined),
} as unknown as AmlEventPublisher;

function svc(prisma: ReturnType<typeof fakePrisma>): AmlService {
  return new AmlService(
    prisma as never,
    new RiskScorerService(),
    new ListScreenerService(),
    publisher,
  );
}

const baseEvent = (over: Partial<FinancialEvent> = {}): FinancialEvent => ({
  transactionId: 'tx-1',
  type: 'TRANSFER',
  status: 'COMPLETED',
  amountMinor: '10000',
  currency: 'XAF',
  walletIds: ['w1', 'w2'],
  ...over,
});

describe('AmlService (GOURSI-025)', () => {
  it('transaction clean → aucune alerte, aucun événement', async () => {
    const prisma = fakePrisma();
    const result = await svc(prisma).analyze(baseEvent({ senderName: 'AMADOU BARRY' }));
    expect(result.alertCreated).toBe(false);
    expect(prisma.amlAlert.create).not.toHaveBeenCalled();
    expect(publisher.publishAlertCreated).not.toHaveBeenCalled();
  });

  it('nom listé (exact) → alerte CRITIQUE + freeze', async () => {
    const prisma = fakePrisma();
    const result = await svc(prisma).analyze(baseEvent({ senderName: 'Ibrahïm Koné', senderCountry: 'ML' }));
    expect(result.alertCreated).toBe(true);
    expect(prisma.created[0]?.severity).toBe('CRITICAL');
    expect(prisma.created[0]?.riskScore).toBe(100);
    expect(publisher.publishAlertCreated).toHaveBeenCalledWith(
      expect.objectContaining({ freeze: true, severity: 'CRITICAL' }),
    );
  });

  it('montant élevé seul → score 20, pas d’alerte', async () => {
    const prisma = fakePrisma();
    const result = await svc(prisma).analyze(baseEvent({ amountMinor: '900000' }));
    expect(result.alertCreated).toBe(false);
  });

  it('workflow : CONFIRM sans commentaire → erreur', async () => {
    const prisma = fakePrisma();
    await prisma.amlAlert.create({ data: { id: 'alert-1', transactionId: 'tx-1', status: 'OPEN' } as never });
    await expect(svc(prisma).actOnAlert('alert-1', 'CONFIRM', 'ok', 'officer-1')).rejects.toThrow('AML_COMMENT_REQUIRED');
  });

  it('workflow : CONFIRM avec commentaire → statut CONFIRMED + événement resolved', async () => {
    const prisma = fakePrisma();
    await prisma.amlAlert.create({ data: { transactionId: 'tx-1', riskScore: 90, severity: 'HIGH', status: 'OPEN' } as never });
    const updated = await svc(prisma).actOnAlert('alert-1', 'CONFIRM', 'documentation fournie, vérifiée', 'officer-1');
    expect(updated.status).toBe('CONFIRMED');
    expect(prisma.amlAction.create).toHaveBeenCalled();
    expect(publisher.publishAlertResolved).toHaveBeenCalledWith(
      expect.objectContaining({ resolution: 'CONFIRM', transactionId: 'tx-1' }),
    );
  });
});
