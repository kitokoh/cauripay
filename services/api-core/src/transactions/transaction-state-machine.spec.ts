import { TransactionStateMachine } from './transaction-state-machine';
import { TransactionStatus } from '@prisma/client';
import { ConflictException } from '@nestjs/common';

describe('TransactionStateMachine', () => {
  const sm = new TransactionStateMachine();

  it('autorise pending → processing', () => {
    expect(sm.canTransition(TransactionStatus.PENDING, TransactionStatus.PROCESSING)).toBe(true);
  });

  it('autorise processing → succeeded', () => {
    expect(sm.canTransition(TransactionStatus.PROCESSING, TransactionStatus.SUCCEEDED)).toBe(true);
  });

  it('autorise succeeded → reversed', () => {
    expect(sm.canTransition(TransactionStatus.SUCCEEDED, TransactionStatus.REVERSED)).toBe(true);
  });

  it('refuse pending → succeeded (saut)', () => {
    expect(sm.canTransition(TransactionStatus.PENDING, TransactionStatus.SUCCEEDED)).toBe(false);
  });

  it('refuse failed → succeeded', () => {
    expect(sm.canTransition(TransactionStatus.FAILED, TransactionStatus.SUCCEEDED)).toBe(false);
  });

  it('lève 409 sur transition invalide', () => {
    expect(() =>
      sm.assertCanTransition(TransactionStatus.PENDING, TransactionStatus.REVERSED),
    ).toThrow(ConflictException);
  });
});
