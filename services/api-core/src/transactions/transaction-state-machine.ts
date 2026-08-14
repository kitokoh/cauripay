import { Injectable, ConflictException } from '@nestjs/common';
import { TransactionStatus } from '@prisma/client';

/**
 * Machine à états des transactions (spec §4.4).
 * Transitions invalides → 409 CONFLICT.
 */
const VALID_TRANSITIONS: Record<TransactionStatus, TransactionStatus[]> = {
  PENDING: [TransactionStatus.PROCESSING, TransactionStatus.CANCELLED, TransactionStatus.FAILED],
  PROCESSING: [TransactionStatus.SUCCEEDED, TransactionStatus.FAILED, TransactionStatus.CANCELLED],
  SUCCEEDED: [TransactionStatus.REVERSED],
  FAILED: [],
  CANCELLED: [],
  REVERSED: [],
};

@Injectable()
export class TransactionStateMachine {
  canTransition(from: TransactionStatus, to: TransactionStatus): boolean {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
  }

  assertCanTransition(from: TransactionStatus, to: TransactionStatus) {
    if (!this.canTransition(from, to)) {
      throw new ConflictException({
        code: 'INVALID_TRANSITION',
        message: `Transition ${from} → ${to} interdite`,
      });
    }
  }
}
