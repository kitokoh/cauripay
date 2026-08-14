import { ConflictException, NotFoundException } from '@nestjs/common';
import { KycStatus } from '@prisma/client';
import { DocumentCryptoService } from '../crypto/document-crypto.service';
import { EventsService } from '../events/events.service';
import { PrismaService } from '../prisma/prisma.service';
import { KycService } from './kyc.service';

describe('KycService — workflow complet (GOURSI-024a/b/c)', () => {
  const KEY = 'clé-dev-déterministe-32-octets-!!!!!!';
  const USER = 'user-1';
  const OFFICER = 'officer-1';

  let service: KycService;
  const prisma = {
    kycRecord: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };
  const events = { publish: jest.fn().mockResolvedValue(undefined) };
  const config = { get: (p: string) => (p === 'env.kycEncryptionKey' ? KEY : undefined) };

  const validDto = {
    level: 'VERIFIED',
    documentType: 'NATIONAL_ID',
    documentBase64: Buffer.from('doc').toString('base64'),
    selfieBase64: Buffer.from('selfie').toString('base64'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    const crypto = new DocumentCryptoService(config as never);
    service = new KycService(prisma as unknown as PrismaService, crypto, events as unknown as EventsService);
  });

  it('submit : enregistre PENDING avec documents chiffrés + publie kyc.submitted', async () => {
    const encryptedDoc = Buffer.from('doc').toString('base64');
    prisma.kycRecord.create.mockResolvedValue({
      id: 'rec-1',
      userId: USER,
      level: 'VERIFIED',
      documentType: 'NATIONAL_ID',
      status: KycStatus.PENDING,
      document: encryptedDoc,
      selfie: 'encrypted',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const record = await service.submit(validDto as never, USER);

    expect(prisma.kycRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: KycStatus.PENDING,
          // le document stocké ne contient JAMAIS le clair
          document: expect.not.stringContaining('doc'),
        }),
      }),
    );
    expect(events.publish).toHaveBeenCalledWith('kyc.submitted', expect.objectContaining({ userId: USER }));
    // minimisation : pas de blob dans la réponse
    expect((record as Record<string, unknown>).document).toBeUndefined();
    expect((record as Record<string, unknown>).selfie).toBeUndefined();
  });

  it('approve : PENDING → APPROVED + décision tracée + kyc.approved', async () => {
    prisma.kycRecord.findUnique.mockResolvedValue({
      id: 'rec-1', userId: USER, level: 'VERIFIED', status: KycStatus.PENDING,
    });
    prisma.kycRecord.update.mockResolvedValue({
      id: 'rec-1', userId: USER, level: 'VERIFIED', status: KycStatus.APPROVED,
      decidedBy: OFFICER, decidedAt: new Date(),
    });

    await service.approve('rec-1', OFFICER);

    expect(prisma.kycRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: KycStatus.APPROVED, decidedBy: OFFICER }) }),
    );
    expect(events.publish).toHaveBeenCalledWith('kyc.approved', expect.objectContaining({ userId: USER, level: 'VERIFIED' }));
  });

  it('reject : PENDING → REJECTED avec motif', async () => {
    prisma.kycRecord.findUnique.mockResolvedValue({
      id: 'rec-1', userId: USER, level: 'VERIFIED', status: KycStatus.PENDING,
    });
    prisma.kycRecord.update.mockResolvedValue({
      id: 'rec-1', userId: USER, level: 'VERIFIED', status: KycStatus.REJECTED, reason: 'doc illisible',
    });

    await service.reject('rec-1', { reason: 'doc illisible' }, OFFICER);

    expect(events.publish).toHaveBeenCalledWith('kyc.rejected', expect.objectContaining({ reason: 'doc illisible' }));
  });

  it('double traitement (déjà approuvé) → 409 ConflictException', async () => {
    prisma.kycRecord.findUnique.mockResolvedValue({
      id: 'rec-1', userId: USER, level: 'VERIFIED', status: KycStatus.APPROVED,
    });
    await expect(service.approve('rec-1', OFFICER)).rejects.toThrow(ConflictException);
    await expect(service.reject('rec-1', { reason: 'x' }, OFFICER)).rejects.toThrow(ConflictException);
  });

  it('dossier inconnu → 404', async () => {
    prisma.kycRecord.findUnique.mockResolvedValue(null);
    await expect(service.approve('nope', OFFICER)).rejects.toThrow(NotFoundException);
  });

  it('queue : filtre PENDING + pagination', async () => {
    prisma.kycRecord.findMany.mockResolvedValue([]);
    await service.queue(KycStatus.PENDING, 'VERIFIED', 'NATIONAL_ID', 2);
    expect(prisma.kycRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: KycStatus.PENDING, level: 'VERIFIED', documentType: 'NATIONAL_ID' }),
        skip: 25,
        take: 25,
      }),
    );
  });
});
