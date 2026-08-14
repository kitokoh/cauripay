import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { KycLevel, KycStatus, Prisma } from '../../generated/kyc';
import { PrismaService } from '../prisma/prisma.service';
import { AesService } from '../crypto/aes.service';
import { KycEventsPublisher } from '../amq/kyc-events.publisher';
import { RejectKycDto, SubmitKycDto } from './dto/kyc.dto';

export interface KycView {
  id: string;
  userId: string;
  level: KycLevel;
  documentType: string;
  status: KycStatus;
  rejectReason: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
}

/** Projection publique : JAMAIS les documents chiffrés ni les données personnelles brutes. */
function toView(r: {
  id: string; userId: string; level: KycLevel; documentType: string; status: KycStatus;
  rejectReason: string | null; reviewedBy: string | null; reviewedAt: Date | null; createdAt: Date;
}): KycView {
  return {
    id: r.id, userId: r.userId, level: r.level, documentType: r.documentType, status: r.status,
    rejectReason: r.rejectReason, reviewedBy: r.reviewedBy, reviewedAt: r.reviewedAt, createdAt: r.createdAt,
  };
}

@Injectable()
export class KycService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aes: AesService,
    private readonly events: KycEventsPublisher,
  ) {}

  /** GOURSI-024a · dépôt d'un dossier : documents chiffrés AES-256, statut PENDING. */
  async submit(userId: string, dto: SubmitKycDto): Promise<KycView> {
    const documentEnc = this.aes.encrypt(Buffer.from(dto.documentBase64, 'base64'));
    const selfieEnc = dto.selfieBase64 ? this.aes.encrypt(Buffer.from(dto.selfieBase64, 'base64')) : null;

    const record = await this.prisma.kycRecord.create({
      data: {
        userId,
        level: dto.level,
        documentType: dto.documentType,
        documentEnc,
        selfieEnc,
        status: 'PENDING',
      },
    });

    await this.events.publish('kyc.submitted', { userId, kycId: record.id, level: dto.level, documentType: dto.documentType });
    return toView(record);
  }

  /** GOURSI-024c · file COMPLIANCE_OFFICER (PENDING par défaut, pagination simple). */
  async queue(params: { status?: KycStatus; level?: KycLevel; documentType?: string; from?: string; page?: number }): Promise<{ records: KycView[]; page: number; hasMore: boolean }> {
    const page = Math.max(params.page ?? 1, 1);
    const take = 25;
    const where: Prisma.KycRecordWhereInput = {
      status: params.status ?? 'PENDING',
      ...(params.level ? { level: params.level } : {}),
      ...(params.documentType ? { documentType: params.documentType } : {}),
      ...(params.from ? { createdAt: { gte: new Date(params.from) } } : {}),
    };
    const [records] = await this.prisma.$transaction([
      this.prisma.kycRecord.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * take, take: take + 1 }),
    ]);
    return { records: records.slice(0, take).map(toView), page, hasMore: records.length > take };
  }

  /** GOURSI-024b · approbation par un officier compliance. Double traitement → 409. */
  async approve(id: string, officerId: string): Promise<KycView> {
    const updated = await this.prisma.kycRecord.updateMany({
      where: { id, status: 'PENDING' },
      data: { status: 'APPROVED', reviewedBy: officerId, reviewedAt: new Date() },
    });
    if (updated.count === 0) {
      const existing = await this.prisma.kycRecord.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException({ code: 'KYC_NOT_FOUND', message: 'Dossier KYC introuvable' });
      throw new ConflictException({ code: 'KYC_ALREADY_PROCESSED', message: `Dossier déjà traité (${existing.status})` });
    }
    const record = await this.prisma.kycRecord.findUniqueOrThrow({ where: { id } });
    await this.events.publish('kyc.approved', { userId: record.userId, kycId: record.id, level: record.level });
    return toView(record);
  }

  /** GOURSI-024b · rejet motivé → événement (le client est prévenu via notification-service). */
  async reject(id: string, officerId: string, dto: RejectKycDto): Promise<KycView> {
    const updated = await this.prisma.kycRecord.updateMany({
      where: { id, status: 'PENDING' },
      data: { status: 'REJECTED', rejectReason: dto.reason, reviewedBy: officerId, reviewedAt: new Date() },
    });
    if (updated.count === 0) {
      const existing = await this.prisma.kycRecord.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException({ code: 'KYC_NOT_FOUND', message: 'Dossier KYC introuvable' });
      throw new ConflictException({ code: 'KYC_ALREADY_PROCESSED', message: `Dossier déjà traité (${existing.status})` });
    }
    const record = await this.prisma.kycRecord.findUniqueOrThrow({ where: { id } });
    await this.events.publish('kyc.rejected', { userId: record.userId, kycId: record.id, reason: dto.reason });
    return toView(record);
  }
}
