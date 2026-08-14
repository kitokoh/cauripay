import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp, { ChannelWrapper } from 'amqp-connection-manager';
import type { Channel, ConsumeMessage } from 'amqplib';
import { PrismaService } from '../prisma/prisma.service';
import { WalletStatus } from '@goursi/shared-types';

/**
 * Consumer AMQP (GOURSI-025d) : aml.events (alert.created) → gel wallet (FROZEN).
 * La topologie (exchanges/queues/bindings) est déclarée côté infra/rabbitmq.
 */
@Injectable()
export class AmqConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AmqConsumer.name);
  private connection?: ReturnType<typeof amqp.connect>;
  private channel?: ChannelWrapper;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    const url = this.config.get<string>('env.rabbitmqUrl')!;
    this.connection = amqp.connect([url]);
    this.channel = this.connection.createChannel({
      json: true,
      setup: (ch: Channel) =>
        ch.assertQueue('q.api-core.aml', { durable: true }).then(() =>
          ch.bindQueue('q.api-core.aml', 'aml.events', 'alert.#'),
        ),
    });
    await this.channel.addSetup(async (ch: Channel) => {
      await ch.consume('q.api-core.aml', (msg: ConsumeMessage | null) => {
        if (!msg) return;
        void this.handleAmlAlert(msg.content.toString()).finally(() => ch.ack(msg));
      });
    });
    this.logger.log('Consumer aml.events actif (gel wallet)');
  }

  async handleAmlAlert(payload: string): Promise<void> {
    try {
      const event = JSON.parse(payload) as { userId?: string; walletId?: string; score?: number };
      const targetWalletId = event.walletId;
      if (!targetWalletId) {
        this.logger.warn('AmlAlert sans walletId, ignoré');
        return;
      }
      await this.prisma.wallet.update({
        where: { id: targetWalletId },
        data: { status: WalletStatus.FROZEN },
      });
      await this.prisma.auditLog.create({
        data: {
          resourceType: 'Wallet',
          resourceId: targetWalletId,
          action: 'AML_FREEZE',
          details: { score: event.score ?? null },
        },
      });
      this.logger.warn(`Wallet ${targetWalletId} GELÉ (alerte AML)`);
    } catch (e) {
      this.logger.error('Échec traitement alerte AML', (e as Error).message);
    }
  }

  async onModuleDestroy() {
    await this.connection?.close();
  }
}
