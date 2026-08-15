import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp, { ChannelWrapper } from 'amqp-connection-manager';
import type { Channel } from 'amqplib';
import { randomUUID } from 'crypto';

export type AuditAction =
  | 'TRANSACTION_REVERSE'
  | 'KYC_APPROVE'
  | 'KYC_REJECT'
  | 'WALLET_FREEZE'
  | 'WALLET_UNFREEZE'
  | 'API_KEY_ROTATE'
  | 'API_KEY_REVOKE'
  | 'MERCHANT_APPROVE'
  | 'BULK_APPROVE';

export interface AuditEntry {
  id: string;
  action: AuditAction;
  actorId: string;
  actorRole?: string;
  targetType: string; // wallet / user / kyc_record / api_key / transaction
  targetId: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  at: string; // ISO-8601
}

/**
 * Audit trail consolidé (GOURSI-SEC3) — publie chaque action sensible sur
 * l'exchange `audit.events` (fanout) : reverse, KYC approve/reject, gel/dégel
 * wallet, rotation/révocation de clés. Consommé par un collecteur d'audit.
 */
@Injectable()
export class AuditTrailService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuditTrailService.name);
  private connection?: ReturnType<typeof amqp.connect>;
  private channel?: ChannelWrapper;
  private readonly enabled: boolean;

  constructor(private readonly config: ConfigService) {
    // En test/CI sans RabbitMQ : les événements sont loggés (pas de crash).
    this.enabled = this.config.get<string>('RABBITMQ_URL') !== undefined;
  }

  async onModuleInit() {
    if (!this.enabled) {
      this.logger.warn('audit.events : RabbitMQ non configuré — mode dégradé (logs)');
      return;
    }
    try {
      const url = this.config.get<string>('env.rabbitmqUrl')!;
      this.connection = amqp.connect([url]);
      this.channel = this.connection.createChannel({
        json: true,
        setup: (ch: Channel) => ch.assertExchange('audit.events', 'fanout', { durable: true }),
      });
      this.logger.log('AuditTrailService : publisher audit.events actif');
    } catch (e) {
      this.logger.error(`Impossible de connecter RabbitMQ pour audit.events: ${e}`);
    }
  }

  async onModuleDestroy() {
    await this.connection?.close();
  }

  /** Enregistre une action sensible (qui, quoi, quand, pourquoi). */
  async record(entry: Omit<AuditEntry, 'id' | 'at'>): Promise<AuditEntry> {
    const full: AuditEntry = {
      ...entry,
      id: `aud_${randomUUID().slice(0, 12)}`,
      at: new Date().toISOString(),
    };
    if (this.channel) {
      try {
        await this.channel.publish('audit.events', '', full, { persistent: true });
      } catch (e) {
        this.logger.error(`Publication audit échouée: ${e}`);
      }
    }
    this.logger.log(
      `[AUDIT] ${full.action} ${full.targetType}:${full.targetId} par ${full.actorId}${full.reason ? ` (${full.reason})` : ''}`,
    );
    return full;
  }

  /** Helper : gel/dégel wallet. */
  freezeWallet(actorId: string, walletId: string, reason: string, role?: string) {
    return this.record({
      action: 'WALLET_FREEZE',
      actorId,
      actorRole: role,
      targetType: 'wallet',
      targetId: walletId,
      reason,
    });
  }

  /** Helper : approve/reject KYC. */
  kycDecision(
    action: 'KYC_APPROVE' | 'KYC_REJECT',
    actorId: string,
    userId: string,
    reason?: string,
    role?: string,
  ) {
    return this.record({
      action,
      actorId,
      actorRole: role,
      targetType: 'kyc_record',
      targetId: userId,
      reason,
    });
  }

  /** Helper : reversal transaction. */
  transactionReverse(actorId: string, transactionId: string, reason: string, role?: string) {
    return this.record({
      action: 'TRANSACTION_REVERSE',
      actorId,
      actorRole: role,
      targetType: 'transaction',
      targetId: transactionId,
      reason,
    });
  }
}
