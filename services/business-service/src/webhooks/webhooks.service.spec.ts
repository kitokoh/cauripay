import { WebhooksService } from './webhooks.service';

describe('WebhooksService', () => {
  let service: WebhooksService;

  beforeEach(() => {
    service = new WebhooksService();
  });

  it('enregistre un endpoint avec secret', () => {
    const e = service.register({
      merchantId: 'm1',
      url: 'https://app.example.com/hooks',
      events: ['*'],
    });
    expect(e.secret).toHaveLength(32);
    expect(e.active).toBe(true);
  });

  it('signe avec HMAC-SHA256 (t + payload)', () => {
    const e = service.register({
      merchantId: 'm1',
      url: 'https://x.example',
      events: ['payment.succeeded'],
    });
    const sig = service.sign(e, { paymentId: 'p1', amount: 100, status: 'SUCCEEDED' });
    expect(sig).toMatch(/^t=\d+,v1=[a-f0-9]{64}$/);
  });

  it('vérifie une signature', () => {
    const e = service.register({ merchantId: 'm1', url: 'https://x.example', events: ['*'] });
    const body = JSON.stringify({ paymentId: 'p1' });
    const sig = service.sign(e, JSON.parse(body));
    expect(service.verify(e.secret, sig, body)).toBe(true);
    expect(service.verify(e.secret, sig, '{"paymentId":"p2"}')).toBe(false);
  });

  it('dispatche après SUCCESS', async () => {
    service.register({ merchantId: 'm1', url: 'https://x.example', events: ['payment.succeeded'] });
    const d = await service.dispatch('m1', 'payment.succeeded', {
      paymentId: 'p1',
      amount: 100,
      status: 'SUCCEEDED',
    });
    expect(d.status).toBe('DELIVERED');
    expect(d.signature).toContain('v1=');
  });
});
