import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { KycLevel } from '@cauripay/shared-types';
import { DocumentCipher } from './document-cipher.service';

export interface KycRecord {
  userId: string;
  status: 'PENDING' | 'VALIDATED' | 'REJECTED';
  level: KycLevel;
  documents: string[]; // payloads chiffrés
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
}

/**
 * kyc-service — workflow de validation (PENDING → VALIDATED/REJECTED).
 * En phase 0, le stockage est en mémoire (InMemoryKycStore) ; en staging,
 * les records sont persistés en Postgres via le schéma api-core (KycRecord).
 * Les documents sont chiffrés AES-256-GCM avant stockage.
 */
@Injectable()
export class KycService {
  private readonly store = new Map<string, KycRecord>();

  constructor(private readonly cipher: DocumentCipher) {}

  /** POST /kyc/submit — dépôt de documents (chiffrés, PENDING). */
  submit(userId: string, dto: { documents: Array<{ type: string; content: string }> }): KycRecord {
    if (this.store.has(userId)) {
      throw new ConflictException({
        code: 'KYC_ALREADY_EXISTS',
        message: 'Dossier KYC déjà soumis',
      });
    }
    const encrypted = dto.documents.map((d) =>
      this.cipher.encrypt(JSON.stringify({ type: d.type, content: d.content })),
    );
    const record: KycRecord = {
      userId,
      status: 'PENDING',
      level: KycLevel.BASIC,
      documents: encrypted,
      submittedAt: new Date(),
    };
    this.store.set(userId, record);
    return record;
  }

  /** POST /kyc/:userId/approve — validation par COMPLIANCE_OFFICER. */
  approve(
    userId: string,
    reviewerId: string,
    targetLevel: KycLevel = KycLevel.VERIFIED,
  ): KycRecord {
    const record = this.require(userId);
    if (record.status !== 'PENDING') {
      throw new ConflictException({ code: 'KYC_NOT_PENDING', message: 'Dossier déjà traité' });
    }
    record.status = 'VALIDATED';
    record.level = targetLevel;
    record.reviewedAt = new Date();
    record.reviewedBy = reviewerId;
    return record;
  }

  /** POST /kyc/:userId/reject — rejet motivé. */
  reject(userId: string, reviewerId: string, _reason: string): KycRecord {
    const record = this.require(userId);
    if (record.status !== 'PENDING') {
      throw new ConflictException({ code: 'KYC_NOT_PENDING', message: 'Dossier déjà traité' });
    }
    record.status = 'REJECTED';
    record.reviewedAt = new Date();
    record.reviewedBy = reviewerId;
    return record;
  }

  /** GET /kyc/pending — file de validation (COMPLIANCE_OFFICER). */
  pending(): KycRecord[] {
    return [...this.store.values()].filter((r) => r.status === 'PENDING');
  }

  /** GET /kyc/:userId — statut d'un dossier. */
  get(userId: string): KycRecord {
    return this.require(userId);
  }

  private require(userId: string): KycRecord {
    const record = this.store.get(userId);
    if (!record)
      throw new NotFoundException({ code: 'KYC_NOT_FOUND', message: 'Aucun dossier KYC' });
    return record;
  }
}
