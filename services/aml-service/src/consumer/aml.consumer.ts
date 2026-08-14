import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp, { ChannelWrapper } from 'amqp-connection-manager';
import type { Channel } from 'amqplib';
import { AmlService, TransactionEvent } from '../aml/aml.service';
import { ListScreenerService } from '../aml/list-screener.service';

/**
 * Consommateur RabbitMQ de l'aml-service (GOURSI-025a/b) :
 * - financial.events:financial.transaction.completed → scoring de risque
 * - kyc.events:kyc.submitted → screening listes de sanctions
 * Déclarations idempotentes (topologie GOURSI-RMQ1) + DLQ.
 */
@Injectable()
export class AmlConsumer implements OnModuleInit {
  private readonly logger = new Logger(AmlConsumer.name);
  private channel: ChannelWrapper | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly amlService: AmlService,
    private readonly screener: ListScreenerService,
  ) {}

  async onModuleInit(): Promise<void> {
    const url = this.config.get<string>('env.rabbitmqUrl')!;
    const connection = amqp.connect([url]);
    this.channel = connection.createChannel({
      json: true,
      setup: async (channel: Channel) => {
        // Files (durable) + DLQ
        await channel.assertExchange('financial.events', 'topic', { durable: true });
        await channel.assertExchange('kyc.events', 'topic', { durable: true });
        await channel.assertQueue('q.aml.transaction', { durable: true, deadLetterExchange: 'dlx' });
        await channel.assertQueue('q.aml.created', { durable: true, deadLetterExchange: 'dlx' });
        await channel.bindQueue('q.aml.transaction', 'financial.events', 'financial.transaction.completed');
        await channel.bindQueue('q.aml.created', 'kyc.events', 'kyc.submitted');

        await channel.consume('q.aml.transaction', async (msg) => {
          if (!msg) {
            return;
          }
          try {
            const txn = JSON.parse(msg.content.toString()) as TransactionEvent;
            await this.amlService.scoreTransaction(txn);
            channel.ack(msg);
          } catch (error) {
            this.logger.error('Scoring transaction échoué', error instanceof Error ? error.message : error);
            channel.nack(msg, false, true);
          }
        });

        await channel.consume('q.aml.created', async (msg) => {
          if (!msg) {
            return;
          }
          try {
            const payload = JSON.parse(msg.content.toString()) as {
              userId: string;
              level: string;
              [key: string]: unknown;
            };
            const result = await this.screener.screen(payload.userId, null);
            if (result.matched) {
              await this.amlService.createAlert({
                userId: payload.userId,
                transactionId: null,
                riskScore: 100,
                alertType: 'SANCTIONS_MATCH',
                severity: 'CRITICAL',
              });
              this.logger.warn(
                `Match sanctions ${result.party} (${result.name}) pour l'utilisateur ${payload.userId} — gel déclenché`,
              );
            }
            channel.ack(msg);
          } catch (error) {
            this.logger.error('Screening KYC échoué', error instanceof Error ? error.message : error);
            channel.nack(msg, false, true);
          }
        });
      },
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
  }
}
