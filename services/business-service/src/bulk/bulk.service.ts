import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { validatePhoneNumber } from '@goursi/validation-rules';

export type BulkStatus =
  'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface BulkLine {
  lineNumber: number;
  receiverPhone: string;
  amountMinor: number;
  reference: string;
  errors: string[];
  valid: boolean;
}

export interface BulkPayment {
  id: string;
  merchantId: string;
  createdBy: string;
  approvedBy?: string;
  status: BulkStatus;
  lines: BulkLine[];
  currency: string;
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Paiements en masse — workflow maker-checker :
 * DRAFT → PENDING_APPROVAL → APPROVED → PROCESSING → COMPLETED.
 * Le maker ne peut pas approuver sa propre batch (403).
 */
@Injectable()
export class BulkService {
  private readonly batches = new Map<string, BulkPayment>();

  private static readonly MAX_LINES = 10_000;

  /** POST /bulk/uploads : parse CSV (streaming), valide ligne par ligne. */
  upload(merchantId: string, userId: string, csvText: string): BulkPayment {
    const rawLines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const start = Date.now();
    const lines: BulkLine[] = rawLines
      .slice(1)
      .map((line, idx) => this.validateLine(idx + 2, line));
    const elapsed = Date.now() - start;

    if (lines.length > BulkService.MAX_LINES) {
      throw new ConflictException({
        code: 'BULK_TOO_LARGE',
        message: `Max ${BulkService.MAX_LINES} lignes`,
      });
    }
    if (elapsed > 5000) {
      throw new ConflictException({
        code: 'BULK_TOO_SLOW',
        message: `Validation > 5 s (${elapsed} ms)`,
      });
    }

    const batch: BulkPayment = {
      id: `bulk_${crypto.randomUUID().slice(0, 12)}`,
      merchantId,
      createdBy: userId,
      status: 'DRAFT',
      lines,
      currency: 'XAF',
      createdAt: new Date(),
    };
    this.batches.set(batch.id, batch);
    return batch;
  }

  submit(id: string, userId: string): BulkPayment {
    const b = this.require(id);
    this.assert(b.status === 'DRAFT', 'Seul un DRAFT peut être soumis');
    if (b.createdBy === userId) {
      // maker ≠ checker est vérifié à l'approbation ; ici on passe au workflow
    }
    b.status = 'PENDING_APPROVAL';
    return b;
  }

  approve(id: string, checkerId: string): BulkPayment {
    const b = this.require(id);
    this.assert(b.status === 'PENDING_APPROVAL', 'Seul un PENDING_APPROVAL peut être approuvé');
    if (b.createdBy === checkerId) {
      throw new ForbiddenException({
        code: 'MAKER_CHECKER',
        message: 'Le maker ne peut pas approuver sa propre batch',
      });
    }
    b.status = 'APPROVED';
    b.approvedBy = checkerId;
    return b;
  }

  reject(id: string, _checkerId: string): BulkPayment {
    const b = this.require(id);
    this.assert(b.status === 'PENDING_APPROVAL', 'Seul un PENDING_APPROVAL peut être rejeté');
    b.status = 'DRAFT';
    return b;
  }

  execute(id: string): BulkPayment {
    const b = this.require(id);
    this.assert(b.status === 'APPROVED', 'La batch doit être approuvée');
    b.status = 'PROCESSING';
    // En phase 0 : chaque ligne valide produirait une Transaction enfant (parentId)
    // via api-core/ledger. Simulation : marquage COMPLETED.
    const executed = b.lines.filter((l) => l.valid).length;
    b.status = executed > 0 ? 'COMPLETED' : 'FAILED';
    b.completedAt = new Date();
    return b;
  }

  /** Rapport d'export : succès/échecs par ligne (CSV). */
  exportCsv(id: string): string {
    const b = this.require(id);
    const header = 'line,telephone,montant,reference,statut,erreurs';
    const rows = b.lines.map((l) =>
      [
        l.lineNumber,
        l.receiverPhone,
        l.amountMinor,
        l.reference,
        l.valid ? 'OK' : 'ERREUR',
        l.errors.join('|'),
      ].join(','),
    );
    return [header, ...rows].join('\n');
  }

  get(id: string): BulkPayment {
    return this.require(id);
  }

  private validateLine(lineNumber: number, raw: string): BulkLine {
    const [destinataire, telephone, montant, reference, ...rest] = raw.split(',');
    const errors: string[] = [];
    if (!destinataire?.trim()) errors.push('destinataire manquant');
    if (!validatePhoneNumber(telephone ?? '')) errors.push('téléphone invalide');
    const amount = Number(montant);
    if (!montant || Number.isNaN(amount) || amount <= 0) errors.push('montant invalide');
    if (!reference?.trim()) errors.push('référence manquante');
    if (rest.length > 0) errors.push('colonnes en trop');
    return {
      lineNumber,
      receiverPhone: (telephone ?? '').trim(),
      amountMinor: Number.isNaN(amount) ? 0 : Math.round(amount),
      reference: (reference ?? '').trim(),
      errors,
      valid: errors.length === 0,
    };
  }

  private require(id: string): BulkPayment {
    const b = this.batches.get(id);
    if (!b) throw new NotFoundException({ code: 'BULK_NOT_FOUND', message: 'Batch inconnue' });
    return b;
  }

  private assert(cond: boolean, msg: string) {
    if (!cond) throw new ConflictException({ code: 'INVALID_TRANSITION', message: msg });
  }
}
