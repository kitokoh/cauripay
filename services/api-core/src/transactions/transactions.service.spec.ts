import { Test } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { FeesService, LimitsService } from './fees-limits.service';
import { LedgerClientService, LedgerError } from '../ledger-client/ledger-client.service';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { KycLevel, TransactionStatus, WalletStatus, WalletType } from '@goursi/shared-types';

describe('TransactionsService — orchestration P2P (spec §4.3)', () => {
  let service: TransactionsService;
  let prisma: any;
  let ledger: { transferAtomic: jest.Mock; getBalance: jest.Mock };

  const sender = {
    id: 'u-sender',
    phone: '+23566000001',
    role: 'CUSTOMER',
    kycLevel: KycLevel.BASIC,
    wallets: [{ id: 'w-from', status: WalletStatus.ACTIVE }],
  };
  const toWallet = { id: 'w-to', accountNumber: '23566000002', status: WalletStatus.ACTIVE, ownerId: 'u-to' };
  const feesWallet = { id: 'w-fees', type: WalletType.PLATFORM_FEES };

  beforeEach(async () => {
    ledger = {
      transferAtomic: jest.fn(),
      getBalance: jest.fn().mockResolvedValue({ availableBalance: '100000.00', balance: '100000.00' }),
    };
    prisma = {
      transaction: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'tx-1', ...data })),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'tx-1', status: data.status, metadata: data.metadata })),
        aggregate: jest.fn().mockResolvedValue({ _sum: { amountMinor: '0' } }),
      },
      user: { findUnique: jest.fn().mockResolvedValue(sender) },
      wallet: {
        findUnique: jest.fn().mockResolvedValue(toWallet),
        findFirst: jest.fn().mockResolvedValue(feesWallet),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const redis = { publish: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: FeesService, useValue: new FeesService() },
        { provide: LimitsService, useValue: new LimitsService() },
        { provide: LedgerClientService, useValue: ledger },
        { provide: AuthService, useValue: { sendOtp: jest.fn(), verifyOtp: jest.fn() } },
        { provide: 'REDIS', useValue: redis },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(TransactionsService);
  });

  const dto = { idempotencyKey: 'cmd-001', toAccountNumber: '23566000002', amountMinor: '10000.00' };

  it('parcours complet : idempotence → wallet → limites → frais → PENDING → ledger → SUCCESS', async () => {
    ledger.transferAtomic.mockResolvedValue({
      transactionId: 'tx-1',
      ledgerEntryIds: ['e1', 'e2', 'e3', 'e4'],
    });

    const result = await service.transfer('u-sender', dto);

    expect(ledger.transferAtomic).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionId: 'tx-1',
        fromWalletId: 'w-from',
        toWalletId: 'w-to',
        amount: '10000.00',
        feeAmount: '100.00', // 1 %
        platformFeesWalletId: 'w-fees',
      }),
    );
    // PENDING créé avant l'appel ledger
    expect(prisma.transaction.create).toHaveBeenCalled();
    expect(result.status).toBe(TransactionStatus.SUCCESS);
    expect(result.metadata).toEqual({ ledgerEntryIds: ['e1', 'e2', 'e3', 'e4'] });
  });

  it('même idempotencyKey → transaction existante retournée, AUCUN appel ledger', async () => {
    prisma.transaction.findUnique.mockResolvedValue({ id: 'tx-dup', status: TransactionStatus.SUCCESS });
    const result = await service.transfer('u-sender', dto);
    expect(result.id).toBe('tx-dup');
    expect(ledger.transferAtomic).not.toHaveBeenCalled();
  });

  it('limite KYC dépassée → 422 AVANT tout appel ledger', async () => {
    prisma.transaction.aggregate.mockResolvedValue({ _sum: { amountMinor: '45000' } }); // BASIC daily 50k
    await expect(service.transfer('u-sender', { ...dto, amountMinor: '10000.00' })).rejects.toMatchObject({
      response: { code: 'KYC_LIMIT_EXCEEDED' },
    });
    expect(ledger.transferAtomic).not.toHaveBeenCalled();
  });

  it('échec ledger (solde insuffisant) → transaction FAILED + erreur propagée', async () => {
    ledger.transferAtomic.mockRejectedValue(new LedgerError(422, 'INSUFFICIENT_FUNDS', 'Solde insuffisant'));
    await expect(service.transfer('u-sender', dto)).rejects.toBeInstanceOf(LedgerError);
    expect(prisma.transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: TransactionStatus.FAILED, failureReason: 'INSUFFICIENT_FUNDS' }) }),
    );
  });

  it('destinataire inconnu → 404 avant PENDING', async () => {
    prisma.wallet.findUnique.mockResolvedValue(null);
    await expect(service.transfer('u-sender', dto)).rejects.toMatchObject({ response: { code: 'RECIPIENT_NOT_FOUND' } });
    expect(prisma.transaction.create).not.toHaveBeenCalled();
  });
});
