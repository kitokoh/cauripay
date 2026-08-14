import { Test } from '@nestjs/testing';
import { AuditTrailService } from './audit-trail.service';
import { ConfigService } from '@nestjs/config';

describe('AuditTrailService (GOURSI-SEC3)', () => {
  let service: AuditTrailService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuditTrailService,
        { provide: ConfigService, useValue: { get: () => undefined } }, // mode dégradé (logs)
      ],
    }).compile();
    service = module.get(AuditTrailService);
  });

  it('enregistre une action sensible avec tous les champs (qui, quoi, quand, pourquoi)', async () => {
    const entry = await service.record({
      action: 'WALLET_FREEZE',
      actorId: 'officer-1',
      actorRole: 'COMPLIANCE_OFFICER',
      targetType: 'wallet',
      targetId: 'wallet-42',
      reason: 'Alerte AML confirmée',
    });
    expect(entry.id).toMatch(/^aud_/);
    expect(entry.action).toBe('WALLET_FREEZE');
    expect(entry.actorId).toBe('officer-1');
    expect(entry.targetId).toBe('wallet-42');
    expect(entry.at).toBeDefined();
    expect(new Date(entry.at).getTime()).not.toBeNaN();
  });

  it('helper freezeWallet produit un enregistrement cohérent', async () => {
    const e = await service.freezeWallet(
      'officer-1',
      'wallet-9',
      'gel suite alerte',
      'COMPLIANCE_OFFICER',
    );
    expect(e.action).toBe('WALLET_FREEZE');
    expect(e.targetType).toBe('wallet');
  });

  it('helper kycDecision couvre approve et reject', async () => {
    const ok = await service.kycDecision('KYC_APPROVE', 'officer-1', 'user-5', 'documents valides');
    const ko = await service.kycDecision('KYC_REJECT', 'officer-1', 'user-6', 'document illisible');
    expect(ok.action).toBe('KYC_APPROVE');
    expect(ko.action).toBe('KYC_REJECT');
    expect(ko.reason).toBe('document illisible');
  });

  it('helper transactionReverse trace le motif', async () => {
    const e = await service.transactionReverse(
      'support-l2',
      'tx-77',
      'double débit constaté',
      'SUPPORT_L2',
    );
    expect(e.action).toBe('TRANSACTION_REVERSE');
    expect(e.targetType).toBe('transaction');
    expect(e.reason).toBe('double débit constaté');
  });

  it('chaque enregistrement a un id unique', async () => {
    const a = await service.record({
      action: 'API_KEY_ROTATE',
      actorId: 'x',
      targetType: 'api_key',
      targetId: 'k1',
    });
    const b = await service.record({
      action: 'API_KEY_REVOKE',
      actorId: 'x',
      targetType: 'api_key',
      targetId: 'k2',
    });
    expect(a.id).not.toBe(b.id);
  });
});
