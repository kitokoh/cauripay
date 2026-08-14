import { DevWebhooksService } from './dev-webhooks.service';
import { SandboxService } from '../sandbox/sandbox.service';

describe('DevWebhooksService', () => {
  let service: DevWebhooksService;

  beforeEach(() => {
    service = new DevWebhooksService();
  });

  it('enregistre un endpoint avec secret', () => {
    const e = service.register('dev1', {
      url: 'https://app.example.com/hooks',
      events: ['payment.succeeded'],
    });
    expect(e.secret).toHaveLength(32);
    expect(e.active).toBe(true);
  });

  it('refuse une URL HTTP (anti-SSRF)', () => {
    expect(() =>
      service.register('dev1', { url: 'http://insecure.example.com', events: ['*'] }),
    ).toThrow('HTTPS');
  });

  it('refuse une IP privée (anti-SSRF)', () => {
    expect(() =>
      service.register('dev1', { url: 'https://127.0.0.1/hooks', events: ['*'] }),
    ).toThrow('privée');
    expect(() =>
      service.register('dev1', { url: 'https://192.168.1.10/hooks', events: ['*'] }),
    ).toThrow('privée');
    expect(() =>
      service.register('dev1', { url: 'https://localhost/hooks', events: ['*'] }),
    ).toThrow('privée');
  });

  it('signe HMAC-SHA256 (t + payload) et vérifie', () => {
    const e = service.register('dev1', { url: 'https://app.example.com/hooks', events: ['*'] });
    const body = JSON.stringify({ paymentId: 'p1' });
    const sig = service.sign(e, JSON.parse(body));
    expect(sig).toMatch(/^t=\d+,v1=[a-f0-9]{64}$/);
    expect(service.verify(e.secret, sig, body)).toBe(true);
  });

  it('rejette une signature modifiée', () => {
    const e = service.register('dev1', { url: 'https://app.example.com/hooks', events: ['*'] });
    const sig = service.sign(e, { paymentId: 'p1' });
    expect(service.verify(e.secret, sig, JSON.stringify({ paymentId: 'p2' }))).toBe(false);
  });
});

describe('SandboxService', () => {
  let sandbox: SandboxService;

  beforeEach(() => {
    sandbox = new SandboxService();
  });

  it('initie puis approuve (pending → processing → succeeded)', () => {
    const p = sandbox.initiate('dev1', { amountMinor: 2500, currency: 'XAF' });
    expect(p.status).toBe('pending');
    const processing = sandbox.approve(p.id);
    expect(processing?.status).toBe('processing');
    const succeeded = sandbox.approve(p.id);
    expect(succeeded?.status).toBe('succeeded');
  });

  it('échoue puis expire', () => {
    const p = sandbox.initiate('dev1', { amountMinor: 100, currency: 'XAF' });
    sandbox.approve(p.id); // pending → processing
    const failed = sandbox.fail(p.id);
    expect(failed?.status).toBe('failed');
    // expire n'agit plus après failed
    expect(sandbox.expire(p.id)).toBeNull();
  });
});
