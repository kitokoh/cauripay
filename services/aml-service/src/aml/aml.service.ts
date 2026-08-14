import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AlertStatus, AlertSeverity, Prisma } from '@prisma/client';
import { EventsService } from '../events/events.service';
import { PrismaService } from '../prisma/prisma.service';
import { RiskScorerService } from './risk-scorer.service';

export interface TransactionEvent {
  transactionId: string;
  type: string;
  amount: number; // unités mineures
  feeAmount?: number;
  status: string;
  walletIds: string[];
  method?: string;
  countryIso?: string | null;
}

/** Orchestration AML (GOURSI-025a/b/c). */
@Injectable()
export class AmlService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scorer: RiskScorerService,
    private readonly events: EventsService,
  ) {}

  /** Scorer une transaction (consommateur financial.events) → alerte si score > 70. */
  async scoreTransaction(txn: TransactionEvent): Promise<void> {
    const score = this.scorer.score(
      txn.amount ?? 0,
      txn.method ?? 'mobile_money',
      txn.countryIso ?? null,
      1,
      0,
    );
    if (!this.scorer.isAlert(score)) {
      return;
    }
    await this.createAlert({
      transactionId: txn.transactionId,
      userId: null,
      riskScore: score,
      alertType: 'RISK_SCORE',
      severity: this.scorer.severityOf(score),
    });
  }

  /** Créer une alerte + publier aml.events:aml.alert.created (api-core gèle le wallet). */
  async createAlert(input: {
    transactionId?: string | null;
    userId?: string | null;
    riskScore: number;
    alertType: string;
    severity: AlertSeverity;
  }): Promise<void> {
    const alert = await this.prisma.amlAlert.create({
      data: {
        transactionId: input.transactionId ?? null,
        userId: input.userId ?? null,
        riskScore: input.riskScore,
        alertType: input.alertType,
        severity: input.severity,
        status: AlertStatus.OPEN,
      },
    });
    await this.events.publish('aml.alert.created', {
      alertId: alert.id,
      transactionId: alert.transactionId ?? undefined,
      userId: alert.userId ?? undefined,
      riskScore: alert.riskScore,
      severity: alert.severity,
      status: 'alert.created',
      timestamp: new Date().toISOString(),
    });
  }

  /** Liste des alertes (COMPLIANCE_OFFICER) avec filtres + pagination. */
  async listAlerts(status?: AlertStatus, severity?: AlertSeverity, page = 1): Promise<unknown[]> {
    const where: Prisma.AmlAlertWhereInput = {};
    if (status) {
      where.status = status;
    }
    if (severity) {
      where.severity = severity;
    }
    const take = 25;
    const skip = Math.max(page - 1, 0) * take;
    return this.prisma.amlAlert.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take });
  }

  /**
   * Action d'un officier : review / confirm / false_positive (commentaire obligatoire).
   * confirm / false_positive clôturent l'alerte ; l'action est auditée.
   */
  async action(id: string, action: 'review' | 'confirm' | 'false_positive', comment: string, officerId: string): Promise<unknown> {
    if (!comment?.trim()) {
      throw new ConflictException({ code: 'COMMENT_REQUIRED', message: 'Un commentaire est obligatoire pour toute action AML' });
    }
    const alert = await this.prisma.amlAlert.findUnique({ where: { id } });
    if (!alert) {
      throw new NotFoundException({ code: 'ALERT_NOT_FOUND', message: 'Alerte AML introuvable' });
    }
    const nextStatus =
      action === 'confirm' ? AlertStatus.CONFIRMED
      : action === 'false_positive' ? AlertStatus.FALSE_POSITIVE
      : AlertStatus.IN_REVIEW;

    return this.prisma.amlAlert.update({
      where: { id },
      data: { status: nextStatus, comment, decidedBy: officerId, decidedAt: new Date() },
    });
  }
}
