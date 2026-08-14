import { Injectable, Logger, UnprocessableEntityException } from '@nestjs/common';
import { IRailAdapter, RailPayment, RailRegistry } from '@cauripay/payment-rail-contracts';

/**
 * PaymentRouter — résout le rail selon (méthode, pays, statut marchand).
 * Fallback : rail GOURSI si le rail demandé est indisponible.
 */
@Injectable()
export class PaymentRouterService {
  private readonly logger = new Logger('PaymentRouterService');

  constructor(private readonly registry: RailRegistry) {}

  /** Acheminement par défaut : méthode mobile_money/card → rail demandé ou GOURSI. */
  route(payment: RailPayment, requestedRail?: string): IRailAdapter {
    const railId = requestedRail ?? this.defaultRailFor(payment);
    const adapter = this.registry.get(railId);
    if (adapter) {
      return adapter;
    }
    const fallback = this.registry.get('GOURSI');
    if (!fallback) {
      throw new UnprocessableEntityException({ code: 'NO_RAIL', message: 'Aucun rail disponible' });
    }
    this.logger.warn(`Rail ${railId} indisponible → fallback GOURSI`);
    return fallback;
  }

  /** Initie un paiement via le rail résolu. */
  async initiate(payment: RailPayment, requestedRail?: string) {
    const adapter = this.route(payment, requestedRail);
    try {
      const result = await adapter.initiate(payment);
      return { rail: adapter.railId, status: result.status, railRef: result.railRef, checkoutUrl: result.checkoutUrl };
    } catch (e) {
      this.logger.error(`Échec rail ${adapter.railId}: ${e instanceof Error ? e.message : e}`);
      return { rail: adapter.railId, status: 'FAILED' as const, railRef: '', error: e instanceof Error ? e.message : 'rail error' };
    }
  }

  private defaultRailFor(_payment: RailPayment): string {
    // règle simple : tout paiement interne passe par GOURSI
    return 'GOURSI';
  }
}
