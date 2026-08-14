import { ConflictException } from '@nestjs/common';
import { TransactionStatus } from '@goursi/shared-types';

/**
 * Machine à états Transaction (GOURSI-023a) :
 * PENDING → PROCESSING → SUCCESS | FAILED ; PENDING → CANCELLED ; tout le reste → 409.
 */
const VALID_TRANSITIONS: Record<TransactionStatus, TransactionStatus[]> = {
  [TransactionStatus.PENDING]: [TransactionStatus.PROCESSING, TransactionStatus.CANCELLED, TransactionStatus.FAILED],
  [TransactionStatus.PROCESSING]: [TransactionStatus.SUCCESS, TransactionStatus.FAILED],
  [TransactionStatus.SUCCESS]: [TransactionStatus.REVERSED],
  [TransactionStatus.FAILED]: [],
  [TransactionStatus.CANCELLED]: [],
  [TransactionStatus.REVERSED]: [],
};

export function assertTransition(from: TransactionStatus, to: TransactionStatus): void {
  const allowed = VALID_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new ConflictException({
      code: 'INVALID_TRANSITION',
      message: `Transition ${from} → ${to} interdite`,
      details: { from, to },
    });
  }
}

export { TransactionStatus };
