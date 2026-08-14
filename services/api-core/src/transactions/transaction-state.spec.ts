import { ConflictException } from '@nestjs/common';
import { assertTransition, TransactionStatus } from './transaction-state';

describe('transaction-state (machine à états)', () => {
  it('autorise PENDING → PROCESSING / CANCELLED / FAILED', () => {
    expect(() => assertTransition(TransactionStatus.PENDING, TransactionStatus.PROCESSING)).not.toThrow();
    expect(() => assertTransition(TransactionStatus.PENDING, TransactionStatus.CANCELLED)).not.toThrow();
    expect(() => assertTransition(TransactionStatus.PENDING, TransactionStatus.FAILED)).not.toThrow();
  });

  it('autorise PROCESSING → SUCCESS / FAILED', () => {
    expect(() => assertTransition(TransactionStatus.PROCESSING, TransactionStatus.SUCCESS)).not.toThrow();
    expect(() => assertTransition(TransactionStatus.PROCESSING, TransactionStatus.FAILED)).not.toThrow();
  });

  it('autorise SUCCESS → REVERSED', () => {
    expect(() => assertTransition(TransactionStatus.SUCCESS, TransactionStatus.REVERSED)).not.toThrow();
  });

  it('refuse les transitions invalides (409)', () => {
    expect(() => assertTransition(TransactionStatus.FAILED, TransactionStatus.SUCCESS)).toThrow(ConflictException);
    expect(() => assertTransition(TransactionStatus.CANCELLED, TransactionStatus.PROCESSING)).toThrow(ConflictException);
    expect(() => assertTransition(TransactionStatus.REVERSED, TransactionStatus.SUCCESS)).toThrow(ConflictException);
    expect(() => assertTransition(TransactionStatus.PENDING, TransactionStatus.SUCCESS)).toThrow(ConflictException);
  });

  it('refuse PENDING → REVERSED (reversal seulement depuis SUCCESS)', () => {
    expect(() => assertTransition(TransactionStatus.PENDING, TransactionStatus.REVERSED)).toThrow(ConflictException);
  });
});
