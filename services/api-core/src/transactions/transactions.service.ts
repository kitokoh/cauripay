import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerClientService, LedgerError } from '../ledger-client/ledger-client.service';
import { FeesService, LimitsService } from './fees-limits.service';
import { AuthService } from '../auth/auth.service';
import { RedisClient, REDIS } from '../prisma/redis.module';
import {
  TransactionStatus,
  TransactionType,
  WalletStatus,
  WalletType,
} from '@goursi/shared-types';
import { assertTransition } from './transaction-state';
import { Transaction, User } from '.prisma/api-core-client';

/**
 * Orchestration des transactions (GOURSI-023) — ordre exact de la spec :
 * idempotence → wallet + KYC → limites → frais → destinataire → PENDING → ledger → SUCCESS → événement.
 * JAMAIS prisma.wallet.update({ balance }) — le ledger est la seule vérité.
 */
@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerClientService,
    private readonly fees: FeesService,
    private readonly limits: LimitsService,
    private readonly auth: AuthService,
    @Inject(REDIS) private readonly redis: RedisClient,
  ) {}

  // ── P2P (GOURSI-023b) ────────────────────────────────────────────────────────

  async transfer(
    userId: string,
    dto: { idempotencyKey: string; toAccountNumber: string; amountMinor: string; description?: string },
  ): Promise<Transaction> {
    // 1) Idempotence
    const existing = await this.prisma.transaction.findUnique({ where: { idempotencyKey: dto.idempotencyKey } });
    if (existing) {
      return existing;
    }

    // 2) Wallet source ACTIVE + KYC
    const sender = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallets: true },
    });
    if (!sender) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Utilisateur inconnu' });
    const fromWallet = sender.wallets.find((w) => w.status === WalletStatus.ACTIVE);
    if (!fromWallet) {
      throw new UnprocessableEntityException({ code: 'WALLET_INACTIVE', message: 'Aucun wallet actif' });
    }

    // 5) Destinataire par accountNumber
    const toWallet = await this.prisma.wallet.findUnique({ where: { accountNumber: dto.toAccountNumber } });
    if (!toWallet || toWallet.status !== WalletStatus.ACTIVE) {
      throw new NotFoundException({ code: 'RECIPIENT_NOT_FOUND', message: 'Destinataire introuvable' });
    }

    // 3) Limites KYC (solde réel depuis ledger)
    const balanceResult = await this.ledger.getBalance(fromWallet.id);
    const dailyTotal = await this.dailyTotal(sender.id);
    const monthlyTotal = await this.monthlyTotal(sender.id);
    const limitCheck = this.limits.check(
      sender.kycLevel as unknown as import('@goursi/shared-types').KycLevel,
      dto.amountMinor, dailyTotal, monthlyTotal, balanceResult.availableBalance);
    if (!limitCheck.allowed) {
      throw new UnprocessableEntityException({
        code: 'KYC_LIMIT_EXCEEDED',
        message: `Limite KYC dépassée (${limitCheck.reason})`,
      });
    }

    // 4) Frais
    const fee = this.fees.calculate(TransactionType.P2P, dto.amountMinor);

    // 6) PENDING (expiresAt +30 min)
    const transaction = await this.prisma.transaction.create({
      data: {
        idempotencyKey: dto.idempotencyKey,
        type: TransactionType.P2P,
        status: TransactionStatus.PENDING,
        amountMinor: dto.amountMinor,
        feeAmountMinor: fee.feeAmount,
        senderId: sender.id,
        recipientId: toWallet.ownerId,
        senderWalletId: fromWallet.id,
        recipientWalletId: toWallet.id,
        description: dto.description ?? 'Envoi P2P',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    // 7) ledger.transferAtomic — échec → FAILED + erreur propagée
    const platformFeesWallet = await this.prisma.wallet.findFirst({ where: { type: WalletType.PLATFORM_FEES } });
    let ledgerResult;
    try {
      ledgerResult = await this.ledger.transferAtomic({
        idempotencyKey: `tx:${transaction.id}`,
        transactionId: transaction.id,
        fromWalletId: fromWallet.id,
        toWalletId: toWallet.id,
        amount: dto.amountMinor,
        feeAmount: fee.feeAmount,
        platformFeesWalletId: platformFeesWallet?.id,
        description: transaction.description ?? undefined,
      });
    } catch (e) {
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: TransactionStatus.FAILED, failureReason: e instanceof LedgerError ? e.code : 'LEDGER_ERROR' },
      });
      throw e;
    }

    // 8) SUCCESS + metadata.ledgerEntryIds
    const done = await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: TransactionStatus.SUCCESS,
        processedAt: new Date(),
        metadata: { ledgerEntryIds: ledgerResult.ledgerEntryIds },
      },
    });
    await this.audit(transaction.id, 'TRANSFER_SUCCESS', userId);

    // 9) Événement financier (consommé par notification/business)
    await this.publishFinancialEvent('transaction.completed', done);
    this.logger.log(`P2P OK ${done.id} ${dto.amountMinor} XAF`);
    return done;
  }

  // ── Cash-in (GOURSI-023d) : agent, OTP client 5 min ──────────────────────────

  async cashIn(
    agentId: string,
    dto: { idempotencyKey: string; clientPhone: string; amountMinor: string },
  ): Promise<{ transactionId: string; awaitingOtp: boolean }> {
    const agent = await this.requireRole(agentId, 'AGENT');
    const client = await this.prisma.user.findUnique({
      where: { phone: dto.clientPhone },
      include: { wallets: true },
    });
    if (!client) throw new NotFoundException({ code: 'CLIENT_NOT_FOUND', message: 'Client introuvable' });
    const clientWallet = client.wallets.find((w) => w.status === WalletStatus.ACTIVE);
    if (!clientWallet) throw new UnprocessableEntityException({ code: 'WALLET_INACTIVE', message: 'Wallet client inactif' });

    const existing = await this.prisma.transaction.findUnique({ where: { idempotencyKey: dto.idempotencyKey } });
    if (existing) return { transactionId: existing.id, awaitingOtp: false };

    const transaction = await this.prisma.transaction.create({
      data: {
        idempotencyKey: dto.idempotencyKey,
        type: TransactionType.CASH_IN,
        status: TransactionStatus.PENDING,
        amountMinor: dto.amountMinor,
        senderId: agent.id,
        recipientId: client.id,
        recipientWalletId: clientWallet.id,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });
    await this.auth.sendOtp(client, 'CASH_IN');
    return { transactionId: transaction.id, awaitingOtp: true };
  }

  async confirmCashIn(
    agentId: string,
    dto: { transactionId: string; clientPhone: string; otp: string },
  ): Promise<Transaction> {
    await this.requireRole(agentId, 'AGENT');
    await this.auth.verifyOtp({ phone: dto.clientPhone, code: dto.otp, purpose: 'CASH_IN' });
    const transaction = await this.prisma.transaction.findUnique({ where: { id: dto.transactionId } });
    if (!transaction || transaction.type !== TransactionType.CASH_IN) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Transaction inconnue' });
    }
    assertTransition(transaction.status as unknown as import('@goursi/shared-types').TransactionStatus, TransactionStatus.PROCESSING);
    if (!transaction.recipientWalletId) throw new UnprocessableEntityException({ code: 'NO_WALLET', message: 'Wallet manquant' });

    const ledgerEntry = await this.ledger.credit({
      idempotencyKey: `tx:${transaction.id}`,
      transactionId: transaction.id,
      walletId: transaction.recipientWalletId,
      amount: transaction.amountMinor.toString(),
      description: 'Cash-in',
    });

    const done = await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: TransactionStatus.SUCCESS, processedAt: new Date(), metadata: { ledgerEntryId: (ledgerEntry as { id: string }).id } },
    });
    await this.publishFinancialEvent('transaction.completed', done);
    return done;
  }

  // ── Cash-out (GOURSI-023e) : agent, OTP client ───────────────────────────────

  async cashOut(
    agentId: string,
    dto: { idempotencyKey: string; clientPhone: string; amountMinor: string; otp: string },
  ): Promise<Transaction> {
    const agent = await this.requireRole(agentId, 'AGENT');
    await this.auth.verifyOtp({ phone: dto.clientPhone, code: dto.otp, purpose: 'CASH_OUT' });
    const client = await this.prisma.user.findUnique({
      where: { phone: dto.clientPhone },
      include: { wallets: true },
    });
    if (!client) throw new NotFoundException({ code: 'CLIENT_NOT_FOUND', message: 'Client introuvable' });
    const clientWallet = client.wallets.find((w) => w.status === WalletStatus.ACTIVE);
    if (!clientWallet) throw new UnprocessableEntityException({ code: 'WALLET_INACTIVE', message: 'Wallet client inactif' });

    const existing = await this.prisma.transaction.findUnique({ where: { idempotencyKey: dto.idempotencyKey } });
    if (existing) return existing;

    const fee = this.fees.calculate(TransactionType.CASH_OUT, dto.amountMinor);
    const transaction = await this.prisma.transaction.create({
      data: {
        idempotencyKey: dto.idempotencyKey,
        type: TransactionType.CASH_OUT,
        status: TransactionStatus.PENDING,
        amountMinor: dto.amountMinor,
        feeAmountMinor: fee.feeAmount,
        senderId: client.id,
        recipientId: agent.id,
        senderWalletId: clientWallet.id,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    try {
      const ledgerEntry = await this.ledger.debit({
        idempotencyKey: `tx:${transaction.id}`,
        transactionId: transaction.id,
        walletId: clientWallet.id,
        amount: dto.amountMinor,
        description: 'Cash-out',
      });
      const done = await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: TransactionStatus.SUCCESS, processedAt: new Date(), metadata: { ledgerEntryId: (ledgerEntry as { id: string }).id } },
      });
      await this.publishFinancialEvent('transaction.completed', done);
      return done;
    } catch (e) {
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: TransactionStatus.FAILED, failureReason: e instanceof LedgerError ? e.code : 'LEDGER_ERROR' },
      });
      throw e;
    }
  }

  // ── Reversal (GOURSI-023h) : SUPPORT_L2+ ─────────────────────────────────────

  async reverse(userId: string, transactionId: string, reason: string): Promise<Transaction> {
    await this.requireRole(userId, 'SUPPORT_L2');
    const transaction = await this.prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!transaction) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Transaction inconnue' });
    assertTransition(transaction.status as unknown as import('@goursi/shared-types').TransactionStatus, TransactionStatus.REVERSED);

    await this.ledger.reverse({
      originalTransactionId: transaction.id,
      idempotencyKey: `rev:${transaction.id}`,
      reason,
    });
    const done = await this.prisma.transaction.update({
      where: { id: transactionId },
      data: { status: TransactionStatus.REVERSED, metadata: { ...(transaction.metadata as object | undefined), reversedAt: new Date().toISOString() } },
    });
    await this.audit(transactionId, 'REVERSE', userId);
    return done;
  }

  // ── Reçu (GOURSI-023g) : SVG partageable ─────────────────────────────────────

  async receipt(transactionId: string): Promise<{ svg: string }> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { sender: true, recipient: true },
    });
    if (!transaction) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Transaction inconnue' });
    const label = transaction.type === TransactionType.P2P ? 'Envoi P2P' : transaction.type;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="560" viewBox="0 0 400 560">
  <rect width="400" height="560" fill="#0b1f3a"/>
  <text x="200" y="60" font-size="24" fill="#ffffff" text-anchor="middle" font-family="sans-serif">GOURSI — Reçu</text>
  <text x="200" y="100" font-size="14" fill="#7dd3fc" text-anchor="middle" font-family="monospace">${transaction.id}</text>
  <text x="200" y="180" font-size="40" fill="#4ade80" text-anchor="middle" font-family="sans-serif">${transaction.amountMinor} XAF</text>
  <text x="200" y="220" font-size="16" fill="#e2e8f0" text-anchor="middle" font-family="sans-serif">${label}</text>
  <line x1="40" y1="250" x2="360" y2="250" stroke="#334155" stroke-width="1"/>
  <text x="40" y="290" font-size="13" fill="#94a3b8" font-family="sans-serif">De : ${transaction.sender?.fullName ?? '—'}</text>
  <text x="40" y="320" font-size="13" fill="#94a3b8" font-family="sans-serif">Vers : ${transaction.recipient?.fullName ?? '—'}</text>
  <text x="40" y="350" font-size="13" fill="#94a3b8" font-family="sans-serif">Statut : ${transaction.status}</text>
  <text x="40" y="380" font-size="13" fill="#94a3b8" font-family="sans-serif">Frais : ${transaction.feeAmountMinor} XAF</text>
  <text x="40" y="410" font-size="13" fill="#94a3b8" font-family="sans-serif">Date : ${transaction.createdAt.toISOString()}</text>
  <text x="200" y="520" font-size="11" fill="#475569" text-anchor="middle" font-family="sans-serif">CauriPay — reçu partageable</text>
</svg>`;
    return { svg };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private async dailyTotal(userId: string): Promise<string> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return this.sumSuccess(userId, start);
  }

  private async monthlyTotal(userId: string): Promise<string> {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return this.sumSuccess(userId, start);
  }

  private async sumSuccess(userId: string, since: Date): Promise<string> {
    const agg = await this.prisma.transaction.aggregate({
      where: {
        senderId: userId,
        status: TransactionStatus.SUCCESS,
        createdAt: { gte: since },
      },
      _sum: { amountMinor: true },
    });
    return agg._sum.amountMinor?.toString() ?? '0';
  }

  private async requireRole(userId: string, role: 'AGENT' | 'SUPPORT_L2'): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Utilisateur inconnu' });
    if (user.role !== role && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: `Rôle ${role} requis` });
    }
    return user;
  }

  private async audit(resourceId: string, action: string, actorId: string): Promise<void> {
    await this.prisma.auditLog.create({
      data: { resourceType: 'Transaction', resourceId, action, actorId },
    });
  }

  private async publishFinancialEvent(eventType: string, transaction: Transaction): Promise<void> {
    // Consommé par notification-service / business-service (webhooks marchand).
    // Implémentation RabbitMQ dédiée dans le module amq (voir app.module).
    this.redis.publish(
      'financial.events',
      JSON.stringify({ eventType, transactionId: transaction.id, type: transaction.type, amount: transaction.amountMinor, status: transaction.status }),
    );
  }
}
