import { PaymentRouterService } from './payment-router.service';
import { RailRegistry } from '@goursi/payment-rail-contracts';
import type { IRailAdapter, RailPayment } from '@goursi/payment-rail-contracts';
import { UnprocessableEntityException } from '@nestjs/common';

/** Rail factice — preuve d'extensibilité : 1 fichier, aucun changement du router. */
class GimacpayRailAdapter implements IRailAdapter {
  readonly railId = 'GIMACPAY';
  initiate(payment: RailPayment) {
    return Promise.resolve({ railRef: `gimac-${payment.id}`, status: 'PROCESSING' as const });
  }
  getStatus(_railRef: string) {
    return Promise.resolve('SUCCEEDED' as const);
  }
  handleCallback() {
    return Promise.resolve('SUCCEEDED' as const);
  }
  close() {
    return Promise.resolve();
  }
}

describe('PaymentRouterService', () => {
  let registry: RailRegistry;
  let router: PaymentRouterService;

  beforeEach(() => {
    registry = new RailRegistry();
    router = new PaymentRouterService(registry);
    // rail GOURSI simulé
    registry.register({
      railId: 'GOURSI',
      initiate: (p) => Promise.resolve({ railRef: p.id, status: 'SUCCEEDED' as const }),
      getStatus: () => Promise.resolve('SUCCEEDED' as const),
      handleCallback: () => Promise.resolve('SUCCEEDED' as const),
      close: () => Promise.resolve(),
    });
  });

  it('route vers le rail demandé', async () => {
    const result = await router.initiate(
      { id: 'p1', amountMinor: 100, currency: 'XAF', method: 'mobile_money' },
      'GOURSI',
    );
    expect(result.rail).toBe('GOURSI');
    expect(result.status).toBe('SUCCEEDED');
  });

  it('route par défaut vers GOURSI', async () => {
    const result = await router.initiate({
      id: 'p2',
      amountMinor: 100,
      currency: 'XAF',
      method: 'mobile_money',
    });
    expect(result.rail).toBe('GOURSI');
  });

  it('retourne FAILED si le rail jette', async () => {
    registry.register({
      railId: 'BROKEN',
      initiate: () => Promise.reject(new Error('boom')),
      getStatus: () => Promise.resolve('FAILED' as const),
      handleCallback: () => Promise.resolve('FAILED' as const),
      close: () => Promise.resolve(),
    });
    const result = await router.initiate(
      { id: 'p3', amountMinor: 100, currency: 'XAF', method: 'x' },
      'BROKEN',
    );
    expect(result.status).toBe('FAILED');
  });

  it('accepte un rail factice sans modifier le router (extensibilité)', async () => {
    registry.register(new GimacpayRailAdapter());
    const result = await router.initiate(
      { id: 'p4', amountMinor: 100, currency: 'XAF', method: 'x' },
      'GIMACPAY',
    );
    expect(result.rail).toBe('GIMACPAY');
    expect(result.railRef).toBe('gimac-p4');
  });

  it('lève 422 si aucun rail n’est enregistré', () => {
    const empty = new PaymentRouterService(new RailRegistry());
    expect(() => empty.route({ id: 'x', amountMinor: 1, currency: 'XAF', method: 'm' })).toThrow(
      UnprocessableEntityException,
    );
  });
});
