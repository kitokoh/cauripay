import 'reflect-metadata';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DocumentType, KycLevel, KycStatus } from '../../node_modules/.prisma/kyc-client';
import { KycService } from './kyc.service';
import { CryptoService } from './crypto.service';
import { KycEventPublisher } from '../amq/kyc-events.publisher';

describe('KycService (GOURSI-024a/b)', () => {
  const records = new Map<string, Record<string, unknown>>();
  let seq = 0;

  const prisma = {
    kycRecord: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        seq += 1;
        const rec = { id: `kyc-${seq}`, ...data, submittedAt: new Date(), updatedAt: new Date() };
        records.set(rec.id as string, rec);
        return rec;
      }),
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) => records.get(where.id) ?? null),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const rec = records.get(where.id);
        if (!rec) throw new Error('not found');
        const merged = { ...rec, ...data };
        records.set(where.id, merged);
        return merged;
      }),
      findMany: jest.fn(async ({ where }: { where: { level?: string; status?: string; documentType?: string } }) =>
        [...records.values()].filter(
          (r) =>
            (!where?.level || r.level === where.level) &&
            (!where?.status || r.status === where.status) &&
            (!where?.documentType || r.documentType === where.documentType),
        ),
      ),
      count: jest.fn(async ({ where }: { where: { level?: string; status?: string } }) =>
        [...records.values()].filter(
          (r) => (!where?.level || r.level === where.level) && (!where?.status || r.status === where.status),
        ).length,
      ),
    },
    $transaction: jest.fn(async (ops: unknown[]) => Promise.all(ops)),
  };

  const events = {
    publish: jest.fn().mockResolvedValue(undefined),
    publishNotification: jest.fn().mockResolvedValue(undefined),
  } as unknown as KycEventPublisher;

  const crypto = {
    encrypt: jest.fn((b64: string) => `ENC:${b64}`),
    decrypt: jest.fn((p: string) => p.replace('ENC:', '')),
  } as unknown as CryptoService;

  const svc = new KycService(prisma as never, crypto, events);

  const submitDto = {
    level: KycLevel.VERIFIED,
    documentType: DocumentType.NATIONAL_ID,
    documentBase64: Buffer.from('{"doc":1}').toString('base64'),
    country: 'TD',
  };

  beforeEach(() => {
    records.clear();
    jest.clearAllMocks();
    seq = 0;
  });

  it('soumission → PENDING + document chiffré + événement kyc.submitted', async () => {
    const rec = await svc.submit('user-1', submitDto);
    expect(rec.status).toBe(KycStatus.PENDING);
    expect(String(rec.documentEncrypted)).toContain('ENC:');
    expect(String(rec.documentEncrypted)).not.toContain('{"doc":1}');
    expect(events.publish).toHaveBeenCalledWith('kyc.submitted', expect.objectContaining({ userId: 'user-1' }));
  });

  it('approbation → APPROVED + kyc.approved + audit (acteur, date)', async () => {
    await svc.submit('user-1', submitDto);
    const result = await svc.approve('kyc-1', 'officer-9');
    expect(result.status).toBe(KycStatus.APPROVED);
    expect(events.publish).toHaveBeenCalledWith('kyc.approved', expect.objectContaining({ level: KycLevel.VERIFIED }));
    expect(records.get('kyc-1')).toMatchObject({ reviewedBy: 'officer-9' });
  });

  it('double traitement → 409', async () => {
    await svc.submit('user-1', submitDto);
    await svc.approve('kyc-1', 'officer-9');
    await expect(svc.approve('kyc-1', 'officer-9')).rejects.toBeInstanceOf(ConflictException);
    await expect(svc.reject('kyc-1', 'officer-9', 'raison')).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejet → REJECTED + raison + notification client', async () => {
    await svc.submit('user-1', submitDto);
    const result = await svc.reject('kyc-1', 'officer-9', 'Document illisible');
    expect(result.status).toBe(KycStatus.REJECTED);
    expect(records.get('kyc-1')).toMatchObject({ rejectReason: 'Document illisible' });
    expect(events.publish).toHaveBeenCalledWith('kyc.rejected', expect.objectContaining({ reason: 'Document illisible' }));
    expect(events.publishNotification).toHaveBeenCalledWith('kyc.rejected', expect.objectContaining({ userId: 'user-1' }));
  });

  it('dossier inconnu → 404', async () => {
    await expect(svc.approve('kyc-xyz', 'officer-9')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('file : PENDING par défaut, filtres par niveau', async () => {
    await svc.submit('u1', submitDto);
    await svc.submit('u2', { ...submitDto, level: KycLevel.PREMIUM });
    const q = await svc.queue({});
    expect(q.total).toBe(2);
    expect(q.items).toHaveLength(2);
    const premium = await svc.queue({ level: KycLevel.PREMIUM });
    expect(premium.total).toBe(1);
  });
});
