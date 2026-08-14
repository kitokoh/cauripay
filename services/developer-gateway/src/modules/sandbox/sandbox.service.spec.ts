import { SandboxService, PAYMENT_EVENT_BY_OUTCOME } from './sandbox.service';
import { WebhooksService } from '../webhooks/webhooks.service';

describe('SandboxService (GOURSI-050c) — simulateur fidèle et isolé', () => {
  const apiKeyId = 'sk-row-1';

  const makeService = () => {
    const webhooks = {
      dispatchEvent: jest.fn().mockResolvedValue({ matched: 1 }),
    } as unknown as WebhooksService;
    return { service: new SandboxService(webhooks), webhooks };
  };

  it('approve → payment.succeeded avec données sandbox (jamais de prod)', async () => {
    const { service, webhooks } = makeService();
    const result = await service.paymentOutcome(apiKeyId, 'approve', {
      amount: 2500,
      currency: 'XAF',
      reference: 'ref-1',
    });

    expect(result).toEqual({ matched: 1 });
    expect(webhooks.dispatchEvent).toHaveBeenCalledWith(
      apiKeyId,
      expect.objectContaining({ type: 'payment.succeeded' }),
    );
    const [, event] = (webhooks.dispatchEvent as jest.Mock).mock.calls[0];
    expect(event.data.status).toBe('APPROVED');
    expect(event.data.sandbox).toBe(true);
    expect(event.data.amount).toBe(2500);
    expect(event.data.currency).toBe('XAF');
    expect(event.data.id).toMatch(/^sandbox_[A-Za-z0-9_-]{16}$/);
  });

  it('fail → payment.failed, expire → payment.expired', async () => {
    const { service, webhooks } = makeService();
    await service.paymentOutcome(apiKeyId, 'fail', {});
    await service.paymentOutcome(apiKeyId, 'expire', {});

    const types = (webhooks.dispatchEvent as jest.Mock).mock.calls.map(([, e]) => e.type);
    expect(types).toEqual(['payment.failed', 'payment.expired']);
  });

  it('mapping outcome → événement complet', () => {
    expect(PAYMENT_EVENT_BY_OUTCOME).toEqual({
      approve: 'payment.succeeded',
      fail: 'payment.failed',
      expire: 'payment.expired',
    });
  });

  it('événement générique : type passé tel quel, data enrichie sandbox', async () => {
    const { service, webhooks } = makeService();
    await service.dispatch(apiKeyId, 'transfer.completed', { amount: 1000 });

    expect(webhooks.dispatchEvent).toHaveBeenCalledWith(
      apiKeyId,
      expect.objectContaining({ type: 'transfer.completed' }),
    );
    const [, event] = (webhooks.dispatchEvent as jest.Mock).mock.calls[0];
    expect(event.data.amount).toBe(1000);
    expect(event.data.sandbox).toBe(true);
  });
});
