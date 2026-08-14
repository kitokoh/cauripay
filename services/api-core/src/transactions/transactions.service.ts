import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { TransactionType as SharedTransactionType } from '@cauripay/shared-types';
import { LedgerClientService } from '../ledger/ledger-client.service';
import { FeesService } from './fees.service';
import { TransactionStateMachine } from './transaction-state-machine';
import { TransactionStatus, TransactionType } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerClientService,
    private readonly fees: FeesService,
    private readonly stateMachine: TransactionStateMachine,
  ) {}

  /**
   * POST /transactions/transfer — orchestration P2P :
   * idempotence → KYC → frais → ledger (transferAtomic) → statut SUCCEEDED.
   */
  async transfer(
    userId: string,
    dto: { receiverPhone: string; amountMinor: number; idempotencyKey: string },
  ) {
    const sender = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallets: true },
    });
    if (!sender)
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Émetteur inconnu' });

    const receiver = await this.prisma.user.findUnique({ where: { phone: dto.receiverPhone } });
    if (!receiver)
      throw new NotFoundException({ code: 'RECEIVER_NOT_FOUND', message: 'Bénéficiaire inconnu' });

    const senderWallet = sender.wallets[0];
    if (!senderWallet) throw new ConflictException({ code: 'NO_WALLET', message: 'Aucun wallet' });

    // Idempotence
    const existing = await this.prisma.transaction.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
    });
    if (existing) return { transaction: existing, replay: true };

    const receiverWallet = (await this.prisma.wallet.findFirst({
      where: { userId: receiver.id },
    }))!;
    const { feeAmount } = this.fees.feeFor(TransactionType.P2P, dto.amountMinor);

    // Limites KYC
    const balance = (await this.ledger.balance(senderWallet.id)).available;
    const limit = this.fees.checkKyc(
      sender.kycLevel,
      dto.amountMinor + feeAmount,
      0,
      0,
      Number(balance),
    );
    if (!limit.allowed) {
      throw new ConflictException({
        code: 'KYC_LIMIT_EXCEEDED',
        message: `Limite KYC: ${limit.reason}`,
      });
    }

    // Ledger (transferAtomic = 4 écritures)
    const ledgerResult = await this.ledger.transfer({
      idempotencyKey: dto.idempotencyKey,
      fromWalletId: senderWallet.id,
      toWalletId: receiverWallet.id,
      amount: String(dto.amountMinor),
      currency: senderWallet.currency,
      type: TransactionType.P2P as unknown as SharedTransactionType,
      reference: `p2p-${dto.idempotencyKey}`,
    });

    const transaction = await this.prisma.transaction.create({
      data: {
        type: TransactionType.P2P,
        status: TransactionStatus.SUCCEEDED,
        amount: dto.amountMinor,
        feeAmount,
        currency: senderWallet.currency,
        senderId: sender.id,
        receiverId: receiver.id,
        ledgerRef: ledgerResult.transferId,
        idempotencyKey: dto.idempotencyKey,
        description: `Envoi P2P vers ${dto.receiverPhone}`,
      },
    });

    return { transaction, replay: false };
  }

  /** POST /transactions/cash-in — agent, crédit wallet via ledger. */
  async cashIn(
    agentId: string,
    dto: { customerPhone: string; amountMinor: number; idempotencyKey: string },
  ) {
    const customer = await this.prisma.user.findUnique({ where: { phone: dto.customerPhone } });
    if (!customer)
      throw new NotFoundException({ code: 'CUSTOMER_NOT_FOUND', message: 'Client inconnu' });
    const wallet = (await this.prisma.wallet.findFirst({ where: { userId: customer.id } }))!;

    const { feeAmount } = this.fees.feeFor(TransactionType.CASH_IN, dto.amountMinor);

    await this.ledger.transfer({
      idempotencyKey: dto.idempotencyKey,
      fromWalletId: process.env.PLATFORM_FEES_WALLET_ID ?? '00000000-0000-0000-0000-000000000000',
      toWalletId: wallet.id,
      amount: String(dto.amountMinor),
      currency: wallet.currency,
      type: TransactionType.CASH_IN as unknown as SharedTransactionType,
      reference: `cashin-${dto.idempotencyKey}`,
    });

    return this.prisma.transaction.create({
      data: {
        type: TransactionType.CASH_IN,
        status: TransactionStatus.SUCCEEDED,
        amount: dto.amountMinor,
        feeAmount,
        currency: wallet.currency,
        receiverId: customer.id,
        senderId: agentId,
        ledgerRef: randomUUID(),
        idempotencyKey: dto.idempotencyKey,
        description: `Cash-in ${dto.customerPhone}`,
      },
    });
  }

  /** POST /transactions/cash-out — agent, débit wallet via ledger. */
  async cashOut(
    agentId: string,
    dto: { customerPhone: string; amountMinor: number; idempotencyKey: string },
  ) {
    const customer = await this.prisma.user.findUnique({ where: { phone: dto.customerPhone } });
    if (!customer)
      throw new NotFoundException({ code: 'CUSTOMER_NOT_FOUND', message: 'Client inconnu' });
    const wallet = (await this.prisma.wallet.findFirst({ where: { userId: customer.id } }))!;

    const { feeAmount } = this.fees.feeFor(TransactionType.CASH_OUT, dto.amountMinor);
    const existing = await this.prisma.transaction.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
    });
    if (existing) return { transaction: existing, replay: true };

    await this.ledger.transfer({
      idempotencyKey: dto.idempotencyKey,
      fromWalletId: wallet.id,
      toWalletId: process.env.PLATFORM_FEES_WALLET_ID ?? '00000000-0000-0000-0000-000000000000',
      amount: String(dto.amountMinor),
      currency: wallet.currency,
      type: TransactionType.CASH_OUT as unknown as SharedTransactionType,
      reference: `cashout-${dto.idempotencyKey}`,
    });

    return this.prisma.transaction.create({
      data: {
        type: TransactionType.CASH_OUT,
        status: TransactionStatus.SUCCEEDED,
        amount: dto.amountMinor,
        feeAmount,
        currency: wallet.currency,
        senderId: customer.id,
        receiverId: agentId,
        ledgerRef: randomUUID(),
        idempotencyKey: dto.idempotencyKey,
        description: `Cash-out ${dto.customerPhone}`,
      },
    });
  }

  /** POST /transactions/:id/reverse — SUPPORT_L2+. */
  async reverse(transactionId: string, dto: { reason: string; idempotencyKey: string }) {
    const tx = await this.prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!tx)
      throw new NotFoundException({
        code: 'TRANSACTION_NOT_FOUND',
        message: 'Transaction inconnue',
      });
    this.stateMachine.assertCanTransition(tx.status, TransactionStatus.REVERSED);

    if (tx.ledgerRef) {
      await this.ledger.transfer({
        idempotencyKey: dto.idempotencyKey,
        fromWalletId: '00000000-0000-0000-0000-000000000000',
        toWalletId: '00000000-0000-0000-0000-000000000000',
        amount: String(tx.amount),
        currency: tx.currency,
        type: TransactionType.P2P as unknown as SharedTransactionType,
        reference: `reverse-${tx.id}`,
      });
    }

    return this.prisma.transaction.update({
      where: { id: transactionId },
      data: { status: TransactionStatus.REVERSED, description: `Reversé: ${dto.reason}` },
    });
  }

  /** GET /transactions/:id/receipt — reçu partageable. */
  async receipt(transactionId: string) {
    const tx = await this.prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!tx)
      throw new NotFoundException({
        code: 'TRANSACTION_NOT_FOUND',
        message: 'Transaction inconnue',
      });
    return {
      receiptId: `RCP-${tx.id.slice(0, 8).toUpperCase()}`,
      transactionId: tx.id,
      type: tx.type,
      status: tx.status,
      amountMinor: tx.amount,
      feeAmount: tx.feeAmount,
      currency: tx.currency,
      createdAt: tx.createdAt,
    };
  }
}
