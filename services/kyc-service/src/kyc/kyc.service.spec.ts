import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { KycService } from './kyc.service';
import { PrismaService } from '../prisma/prisma.service';
import { AesService } from '../crypto/aes.service';
import { KycEventsPublisher } from '../amq/kyc-events.publisher';

describe('KycService (GOURSI-024a/b/c)', () => {
  let service: KycService;
  let prisma: { kycRecord: Record<string, jest.Mock>; $transaction: jest.Mock };
  let aes: { encrypt: jest.Mock; decrypt: jest.Mock };
  let events: { publish: jest.Mock };

  const record = (over: Partial<Record<string, unknown>> = {}) => ({
    id: 'cky_1', userId: 'u_1', level: 'VERIFIED', documentType: 'PASSPORT',
    documentEnc: 'iv:tag:cipher', selfieEnc: null, status: 'PENDING',
    rejectReason: null, reviewedBy: null, reviewedAt: null,
    createdAt: new Date(), updatedAt: new Date(), ...over,
  });

  beforeEach(async () => {
    prisma = { kycRecord: {}, $transaction: jest.fn() } as never;
    aes = { encrypt: jest.fn((b: Buffer) => `enc:${b.toString('base64').slice(0, 8)}`), decrypt: jest.fn() };
    events = { publish: jest.fn().mockResolvedValue(undefined) };

    const module = await Test.createTestingModule({
      providers: [
        KycService,
        { provide: PrismaService, useValue: prisma },
        { provide: AesService, useValue: aes },
        { provide: KycEventsPublisher, useValue: events },
      ],
    }).compile();
    service = module.get(KycService);
  });

  it('submit : document chiffré + statut PENDING + événement kyc.submitted', async () => {
    const created = record();
    prisma.kycRecord.create = jest.fn().mockResolvedValue(created);

    const view = await service.submit('u_1', { level: 'VERIFIED', documentType: 'PASSPORT', documentBase64: 'aGVsbG8=', selfieBase64: 'c2VsZmll' });

    expect(aes.encrypt).toHaveBeenCalledTimes(2); // document + selfie
    const createArg = prisma.kycRecord.create.mock.calls[0][0];
    expect(createArg.data.documentEnc).toMatch(/^enc:/); // chiffré au repos
    expect(createArg.data.status).toBe('PENDING');
    expect(view.status).toBe('PENDING');
    expect(view).not.toHaveProperty('documentEnc'); // jamais exposé
    expect(events.publish).toHaveBeenCalledWith('kyc.submitted', expect.objectContaining({ userId: 'u_1' }));
  });

  it('approve : APPROVED + review + événement kyc.approved', async () => {
    prisma.kycRecord.updateMany = jest.fn().mockResolvedValue({ count: 1 });
    prisma.kycRecord.findUniqueOrThrow = jest.fn().mockResolvedValue(record({ status: 'APPROVED', reviewedBy: 'officer_1' }));

    const view = await service.approve('cky_1', 'officer_1');

    expect(prisma.kycRecord.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'PENDING' }) }),
    );
    expect(view.status).toBe('APPROVED');
    expect(events.publish).toHaveBeenCalledWith('kyc.approved', expect.objectContaining({ userId: 'u_1', level: 'VERIFIED' }));
  });

  it('double traitement → 409', async () => {
    prisma.kycRecord.updateMany = jest.fn().mockResolvedValue({ count: 0 });
    prisma.kycRecord.findUnique = jest.fn().mockResolvedValue(record({ status: 'REJECTED' }));

    await expect(service.approve('cky_1', 'officer_1')).rejects.toBeInstanceOf(ConflictException);
    await expect(service.reject('cky_1', 'officer_1', { reason: 'doc illisible' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('dossier inconnu → 404', async () => {
    prisma.kycRecord.updateMany = jest.fn().mockResolvedValue({ count: 0 });
    prisma.kycRecord.findUnique = jest.fn().mockResolvedValue(null);
    await expect(service.approve('cky_x', 'officer_1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('reject : REJECTED + raison + événement kyc.rejected', async () => {
    prisma.kycRecord.updateMany = jest.fn().mockResolvedValue({ count: 1 });
    prisma.kycRecord.findUniqueOrThrow = jest.fn().mockResolvedValue(record({ status: 'REJECTED', rejectReason: 'doc illisible' }));

    const view = await service.reject('cky_1', 'officer_1', { reason: 'doc illisible' });

    expect(view.status).toBe('REJECTED');
    expect(view.rejectReason).toBe('doc illisible');
    expect(events.publish).toHaveBeenCalledWith('kyc.rejected', expect.objectContaining({ reason: 'doc illisible' }));
  });

  it('queue : PENDING par défaut + pagination', async () => {
    prisma.kycRecord.findMany = jest.fn().mockResolvedValue([record(), record()]);
    prisma.kycRecord.count = jest.fn().mockResolvedValue(12);
    prisma.$transaction = jest.fn().mockImplementation(async (ops: Promise<unknown>[]) => [await ops[0], 12]);
    const res = await service.queue({});
    expect(res.records).toHaveLength(2);
    expect(res.hasMore).toBe(false);
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});
