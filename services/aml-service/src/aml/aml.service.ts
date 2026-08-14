import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RiskScorerService } from '../scoring/risk-scorer.service';
import { ListScreenerService } from '../screening/list-screener.service';
import { AmlEventPublisher } from '../rabbit/aml-event.publisher';
import type { FinancialEvent } from '../rabbit/financial-event.types';

/**
 * Orchestration AML (GOURSI-025) :
 *   financial.events → screening parties → scoring → AmlAlert si score > 70
 *   ou match sanctions exact → alerte CRITIQUE + événement aml.alert.created
 *   (consommé par api-core → gel wallet, GOURSI-025d).
 */
@Injectable()
export class AmlService {
  private readonly logger = new Logger(AmlService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scorer: RiskScorerService,
    private readonly screener: ListScreenerService,
    private readonly publisher: AmlEventPublisher,
  ) {}

  /** Analyse un événement financier (transaction.completed/failed/reversed). */
  async analyze(event: FinancialEvent): Promise<{ alertCreated: boolean; alertId?: string }> {
    const senderName = event.senderName;
    const recipientName = event.recipientName;

    const senderHit = senderName ? this.screener.screen(senderName, event.senderCountry) : null;
    const recipientHit = recipientName ? this.screener.screen(recipientName, event.recipientCountry) : null;
    const worstHit = [senderHit, recipientHit].find((h) => h?.hit) ?? null;

    const todayCount = await this.todayTransactionCount(event.transactionId);
    const score = this.scorer.score({
      transactionId: event.transactionId,
      amountMinor: event.amountMinor ?? '0',
      type: event.type ?? 'P2P',
      country: worstHit?.matchedEntity?.country,
      method: event.method,
      todayCount,
      sanctionsHit: worstHit ? { kind: worstHit.kind!, country: worstHit.matchedEntity?.country } : null,
    });

    // Alerte si score > 70, OU match exact sanctions (toujours critique).
    const critical = worstHit?.kind === 'exact';
    if (!score.alert && !critical) {
      return { alertCreated: false };
    }

    const severity = critical ? 'CRITICAL' : score.score >= 85 ? 'HIGH' : 'MEDIUM';
    const alert = await this.prisma.amlAlert.create({
      data: {
        transactionId: event.transactionId,
        riskScore: score.score,
        severity: severity as never,
        reason: score.reasons.join(', '),
        status: 'OPEN',
      },
    });

    await this.publisher.publishAlertCreated({
      alertId: alert.id,
      transactionId: event.transactionId,
      severity,
      riskScore: score.score,
      walletIds: event.walletIds ?? [],
      freeze: critical || score.score >= 85,
    });

    this.logger.warn(
      `AmlAlert ${alert.id} (${severity}, score ${score.score}) pour ${event.transactionId} — ${score.reasons.join(', ')}`,
    );
    return { alertCreated: true, alertId: alert.id };
  }

  /** Liste des alertes (back-office compliance) — filtrable. */
  listAlerts(opts: { status?: string; severity?: string; limit: number; before?: string }) {
    const where: Record<string, unknown> = {};
    if (opts.status) where.status = opts.status;
    if (opts.severity) where.severity = opts.severity;
    if (opts.before) where.id = { lt: opts.before } as never;
    return this.prisma.amlAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(opts.limit || 50, 1), 200),
      include: { actions: { orderBy: { createdAt: 'desc' } } },
    });
  }

  /** Workflow d'action (review/confirm/false_positive) — commentaire obligatoire, audit. */
  async actOnAlert(alertId: string, action: 'REVIEW' | 'CONFIRM' | 'FALSE_POSITIVE', comment: string, actorId?: string) {
    if (!comment || comment.trim().length < 5) {
      throw new Error('AML_COMMENT_REQUIRED');
    }
    const alert = await this.prisma.amlAlert.findUnique({ where: { id: alertId } });
    if (!alert) throw new Error('AML_ALERT_NOT_FOUND');

    const nextStatus = action === 'FALSE_POSITIVE' ? 'FALSE_POSITIVE' : action === 'CONFIRM' ? 'CONFIRMED' : 'REVIEWED';

    const [, updated] = await this.prisma.$transaction([
      this.prisma.amlAction.create({
        data: { alertId, action, comment: comment.trim(), actorId },
      }),
      this.prisma.amlAlert.update({
        where: { id: alertId },
        data: { status: nextStatus as never, comment: comment.trim(), createdBy: actorId },
      }),
    ]);

    if (action === 'CONFIRM' || action === 'FALSE_POSITIVE') {
      // Le back-office tranche → événement pour api-core (mise à jour Transaction associée).
      await this.publisher.publishAlertResolved({ alertId, transactionId: alert.transactionId, resolution: action });
    }
    return updated;
  }

  private async todayTransactionCount(_transactionId: string): Promise<number> {
    // À terme : comptage des transactions du wallet sur la journée (via ledger/api-core).
    // En l'état, fréquence inconnue → 0 (le scoring reste déterministe et testable).
    return 0;
  }
}
