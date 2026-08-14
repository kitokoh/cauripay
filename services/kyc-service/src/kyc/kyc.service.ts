import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { KycRecord, KycStatus, Prisma } from '../../node_modules/.prisma/kyc-client';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from './crypto.service';
import { KycEventPublisher } from '../amq/kyc-events.publisher';
import { SubmitKycDto } from './dto/kyc.dto';

export interface ReviewResult {
  id: string;
  status: KycStatus;
}

/**
 * kyc-service — cycle de vie des dossiers KYC (GOURSI-024a/b/c).
 * - soumission : documents chiffrés AES-256-GCM au repos, KycRecord PENDING ;
 * - décision (COMPLIANCE_OFFICER) : approve → kyc.approved ; reject → kyc.rejected + notification ;
 * - file de revue avec filtres (PENDING par défaut).
 * Règles : jamais de document en clair dans les logs ; chaque décision est auditée.
 */
@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly events: KycEventPublisher,
  ) {}

  /** POST /kyc/submit — crée le dossier PENDING, chiffre les documents, publie kyc.submitted. */
  async submit(userId: string, dto: SubmitKycDto): Promise<KycRecord> {
    if (!dto.country) {
      // user porteur du dossier → pays par défaut inconnu ; acceptable (optionnel).
    }
    const record = await this.prisma.kycRecord.create({
      data: {
        userId,
        level: dto.level,
        documentType: dto.documentType,
        documentEncrypted: this.crypto.encrypt(dto.documentBase64),
        selfieEncrypted: dto.selfieBase64 ? this.crypto.encrypt(dto.selfieBase64) : null,
        country: dto.country ?? null,
        status: KycStatus.PENDING,
        history: {
          create: { actor: userId, action: 'SUBMIT' },
        },
      },
    });

    await this.events.publish('kyc.submitted', {
      kycId: record.id,
      userId,
      level: record.level,
      documentType: record.documentType,
    });

    this.logger.log(`KYC soumis ${record.id} (${dto.level}) — documents chiffrés`);
    return record;
  }

  /** POST /kyc/:id/approve — PENDING → APPROVED + kyc.approved. Double traitement → 409. */
  async approve(id: string, officerId: string): Promise<ReviewResult> {
    const record = await this.getPending(id);
    const updated = await this.prisma.kycRecord.update({
      where: { id },
      data: {
        status: KycStatus.APPROVED,
        reviewedBy: officerId,
        reviewedAt: new Date(),
        history: { create: { actor: officerId, action: 'APPROVE' } },
      },
    });

    await this.events.publish('kyc.approved', {
      kycId: record.id,
      userId: record.userId,
      level: record.level,
    });

    this.logger.log(`KYC ${id} approuvé par ${officerId}`);
    return { id, status: updated.status };
  }

  /** POST /kyc/:id/reject — PENDING → REJECTED + raison + notification client. */
  async reject(id: string, officerId: string, reason: string): Promise<ReviewResult> {
    const record = await this.getPending(id);
    const updated = await this.prisma.kycRecord.update({
      where: { id },
      data: {
        status: KycStatus.REJECTED,
        rejectReason: reason,
        reviewedBy: officerId,
        reviewedAt: new Date(),
        history: { create: { actor: officerId, action: 'REJECT', reason } },
      },
    });

    await this.events.publish('kyc.rejected', {
      kycId: record.id,
      userId: record.userId,
      level: record.level,
      reason,
    });
    await this.events.publishNotification('kyc.rejected', {
      userId: record.userId,
      kycId: record.id,
    });

    this.logger.log(`KYC ${id} rejeté par ${officerId} : ${reason}`);
    return { id, status: updated.status };
  }

  /** GET /kyc/queue — file de revue (COMPLIANCE_OFFICER), filtres + pagination. */
  async queue(filters: {
    status?: KycStatus;
    level?: string;
    documentType?: string;
    page?: number;
  }): Promise<{ items: KycRecord[]; total: number; page: number; pageSize: number }> {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = 25;
    const where: Prisma.KycRecordWhereInput = {
      ...(filters.status ? { status: filters.status as KycStatus } : { status: KycStatus.PENDING }),
      ...(filters.level ? { level: filters.level as KycRecord['level'] } : {}),
      ...(filters.documentType
        ? { documentType: filters.documentType as KycRecord['documentType'] }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.kycRecord.findMany({
        where,
        orderBy: { submittedAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { history: { orderBy: { createdAt: 'desc' }, take: 5 } },
      }),
      this.prisma.kycRecord.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  /** GET /kyc/:id — détail (documents jamais renvoyés en clair). */
  async getById(id: string): Promise<KycRecord> {
    const record = await this.prisma.kycRecord.findUnique({
      where: { id },
      include: { history: { orderBy: { createdAt: 'desc' } } },
    });
    if (!record) {
      throw new NotFoundException({ code: 'KYC_NOT_FOUND', message: 'Dossier KYC introuvable' });
    }
    return record;
  }

  private async getPending(id: string): Promise<KycRecord> {
    const record = await this.prisma.kycRecord.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException({ code: 'KYC_NOT_FOUND', message: 'Dossier KYC introuvable' });
    }
    if (record.status !== KycStatus.PENDING) {
      throw new ConflictException({
        code: 'KYC_ALREADY_REVIEWED',
        message: `Dossier déjà traité (${record.status})`,
      });
    }
    return record;
  }
}
