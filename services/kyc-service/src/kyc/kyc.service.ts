import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { KycRecord, KycStatus, Prisma } from '@prisma/client';
import { DocumentCryptoService } from '../crypto/document-crypto.service';
import { EventsService } from '../events/events.service';
import { PrismaService } from '../prisma/prisma.service';
import { RejectKycDto, SubmitKycDto } from './dto/kyc.dto';

const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024; // 5 Mo

/** Règles métier KYC (GOURSI-024a/b/c). */
@Injectable()
export class KycService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: DocumentCryptoService,
    private readonly events: EventsService,
  ) {}

  /** Soumission : validation, chiffrement AES-256, enregistrement PENDING + événement. */
  async submit(dto: SubmitKycDto, userId: string): Promise<KycRecord> {
    const document = Buffer.from(dto.documentBase64, 'base64');
    const selfie = Buffer.from(dto.selfieBase64, 'base64');
    if (document.length === 0 || selfie.length === 0) {
      throw new ConflictException({ code: 'EMPTY_DOCUMENT', message: 'Document ou selfie vide' });
    }
    if (document.length > MAX_DOCUMENT_BYTES || selfie.length > MAX_DOCUMENT_BYTES) {
      throw new ConflictException({ code: 'DOCUMENT_TOO_LARGE', message: 'Document ou selfie > 5 Mo' });
    }

    const record = await this.prisma.kycRecord.create({
      data: {
        userId,
        level: dto.level,
        documentType: dto.documentType,
        status: KycStatus.PENDING,
        document: this.crypto.encrypt(document),
        selfie: this.crypto.encrypt(selfie),
      },
    });

    await this.events.publish('kyc.submitted', {
      kycRecordId: record.id,
      userId,
      level: record.level,
      status: 'submitted',
      timestamp: new Date().toISOString(),
    });
    return this.sanitize(record);
  }

  /** Approbation (COMPLIANCE_OFFICER) : PENDING → APPROVED + événement kyc.approved. */
  async approve(id: string, officerId: string): Promise<KycRecord> {
    const record = await this.findPending(id);
    const updated = await this.prisma.kycRecord.update({
      where: { id },
      data: { status: KycStatus.APPROVED, decidedBy: officerId, decidedAt: new Date() },
    });
    await this.events.publish('kyc.approved', {
      kycRecordId: id,
      userId: record.userId,
      level: record.level,
      status: 'approved',
      timestamp: new Date().toISOString(),
    });
    return this.sanitize(updated);
  }

  /** Rejet : PENDING → REJECTED + raison + notification client. */
  async reject(id: string, dto: RejectKycDto, officerId: string): Promise<KycRecord> {
    const record = await this.findPending(id);
    const updated = await this.prisma.kycRecord.update({
      where: { id },
      data: { status: KycStatus.REJECTED, reason: dto.reason, decidedBy: officerId, decidedAt: new Date() },
    });
    await this.events.publish('kyc.rejected', {
      kycRecordId: id,
      userId: record.userId,
      level: record.level,
      status: 'rejected',
      reason: dto.reason,
      timestamp: new Date().toISOString(),
    });
    return this.sanitize(updated);
  }

  /** File de validation (COMPLIANCE_OFFICER) avec filtres + pagination curseur simple. */
  async queue(status?: KycStatus, level?: string, documentType?: string, page = 1): Promise<KycRecord[]> {
    const where: Prisma.KycRecordWhereInput = {};
    if (status) {
      where.status = status;
    }
    if (level) {
      where.level = level as Prisma.EnumKycLevelFilter;
    }
    if (documentType) {
      where.documentType = documentType as Prisma.EnumKycDocumentTypeFilter;
    }
    const take = 25;
    const skip = Math.max((page - 1), 0) * take;
    const records = await this.prisma.kycRecord.findMany({ where, orderBy: { createdAt: 'asc' }, skip, take });
    return records.map((r) => this.sanitize(r));
  }

  /** Détail avec documents déchiffrés — réservé officiers (accès restreint + audit). */
  async detail(id: string): Promise<KycRecord & { documentPlaintextBase64: string; selfiePlaintextBase64: string }> {
    const record = await this.prisma.kycRecord.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException({ code: 'KYC_NOT_FOUND', message: 'Dossier KYC introuvable' });
    }
    return {
      ...this.sanitize(record),
      documentPlaintextBase64: this.crypto.decrypt(record.document).toString('base64'),
      selfiePlaintextBase64: this.crypto.decrypt(record.selfie).toString('base64'),
    };
  }

  private async findPending(id: string): Promise<KycRecord> {
    const record = await this.prisma.kycRecord.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException({ code: 'KYC_NOT_FOUND', message: 'Dossier KYC introuvable' });
    }
    if (record.status !== KycStatus.PENDING) {
      throw new ConflictException({
        code: 'KYC_ALREADY_PROCESSED',
        message: `Dossier déjà traité (${record.status}) — double traitement interdit`,
      });
    }
    return record;
  }

  /** Ne jamais renvoyer les blobs chiffrés dans les listes (minimisation). */
  private sanitize(record: KycRecord): KycRecord {
    const { document: _document, selfie: _selfie, ...safe } = record;
    return safe as unknown as KycRecord;
  }
}
