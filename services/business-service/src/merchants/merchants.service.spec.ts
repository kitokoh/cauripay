import { MerchantsService } from './merchants.service';

describe('MerchantsService', () => {
  let service: MerchantsService;

  beforeEach(() => {
    service = new MerchantsService();
  });

  it('génère un payment-request avec QR SVG + URL', () => {
    const p = service.createPaymentRequest('m1', {
      amountMinor: 25000,
      currency: 'XAF',
      reference: 'cmd-42',
    });
    expect(p.qrSvg).toContain('<svg');
    expect(p.paymentUrl).toContain('/pay/');
    expect(p.status).toBe('PENDING');
  });

  it('refuse un montant non positif', () => {
    expect(() =>
      service.createPaymentRequest('m1', { amountMinor: 0, currency: 'XAF', reference: 'r' }),
    ).toThrow();
  });

  it('calcule les stats (volume, taux de succès)', () => {
    service.createPaymentRequest('m1', { amountMinor: 1000, currency: 'XAF', reference: 'a' });
    service.createPaymentRequest('m1', { amountMinor: 2000, currency: 'XAF', reference: 'b' });
    const stats = service.stats('m1');
    expect(stats.count).toBe(2);
    expect(stats.successRate).toBe(0);
    expect(stats.volumeMinor).toBe(0); // rien de payé
  });
});
