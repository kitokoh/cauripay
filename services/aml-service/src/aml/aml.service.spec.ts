import { ConflictException, NotFoundException } from '@nestjs/common';
import { AlertStatus, AlertSeverity } from '@prisma/client';
import { RiskScorerService } from './risk-scorer.service';
import { AmlService, TransactionEvent } from './aml.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';

describe('AmlService — workflow alertes (GOURSI-025a/c)', () => {
  const prisma = {
    amlAlert: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  };
  const events = { publish: jest.fn().mockResolvedValue(undefined) };

  let service: AmlService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AmlService(prisma as unknown as PrismaService, new RiskScorerService(), events as unknown as EventsService);
  });

  const bigTxn: TransactionEvent = {
    transactionId: 'tx-1',
    type: 'transaction.completed',
    amount: 5_000_000,
    status: 'SUCCESS',
    walletIds: ['w1', 'w2'],
    method: 'international',
  };

  it('transaction à risque → alerte OPEN + événement aml.alert.created', async () => {
    prisma.amlAlert.create.mockResolvedValue({
      id: 'alert-1', transactionId: 'tx-1', riskScore: 45, alertType: 'RISK_SCORE',
      severity: 'MEDIUM', status: AlertStatus.OPEN,
    });
    await service.scoreTransaction(bigTxn);
    expect(prisma.amlAlert.create).toHaveBeenCalled();
    expect(events.publish).toHaveBeenCalledWith('aml.alert.created', expect.objectContaining({ alertId: 'alert-1' }));
  });

  it('transaction saine → aucune alerte', async () => {
    await service.scoreTransaction({ ...bigTxn, amount: 10_000, method: 'mobile_money' });
    expect(prisma.amlAlert.create).not.toHaveBeenCalled();
  });

  it('action sans commentaire → 409', async () => {
    await expect(service.action('a1', 'review', '', 'officer')).rejects.toThrow(ConflictException);
  });

  it('action sur alerte inconnue → 404', async () => {
    prisma.amlAlert.findUnique.mockResolvedValue(null);
    await expect(service.action('nope', 'review', 'ok', 'officer')).rejects.toThrow(NotFoundException);
  });

  it('confirm → statut CONFIRMED + tracé', async () => {
    prisma.amlAlert.findUnique.mockResolvedValue({ id: 'a1', status: AlertStatus.OPEN });
    prisma.amlAlert.update.mockResolvedValue({ id: 'a1', status: AlertStatus.CONFIRMED, comment: 'fraude confirmée', decidedBy: 'officer' });
    await service.action('a1', 'confirm', 'fraude confirmée', 'officer');
    expect(prisma.amlAlert.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: AlertStatus.CONFIRMED, decidedBy: 'officer' }),
    }));
  });

  it('false_positive → statut FALSE_POSITIVE', async () => {
    prisma.amlAlert.findUnique.mockResolvedValue({ id: 'a1', status: AlertStatus.OPEN });
    prisma.amlAlert.update.mockResolvedValue({ id: 'a1', status: AlertStatus.FALSE_POSITIVE });
    await service.action('a1', 'false_positive', 'client légitime', 'officer');
    expect(prisma.amlAlert.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: AlertStatus.FALSE_POSITIVE }),
    }));
  });
});
