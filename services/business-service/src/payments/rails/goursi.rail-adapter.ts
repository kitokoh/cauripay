import {
  IRailAdapter,
  RailCallbackPayload,
  RailPayment,
  RailPaymentStatus,
  RailInitiateResult,
  RailRegistry,
} from '@cauripay/payment-rail-contracts';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

/**
 * Rail GOURSI — paiement interne : déclenche un transferAtomic ledger
 * via api-core (ledger-client). Statuts normalisés par le mapping ci-dessous.
 */
@Injectable()
export class GoursiRailAdapter implements IRailAdapter {
  readonly railId = 'GOURSI';

  private readonly logger = new Logger('GoursiRailAdapter');
  private readonly apiCoreUrl: string;
  private readonly serviceKey: string;

  constructor(config: ConfigService, registry: RailRegistry) {
    this.apiCoreUrl = config.get<string>('API_CORE_URL') ?? 'http://localhost:3000';
    this.serviceKey = config.get<string>('INTERNAL_SERVICE_KEY') ?? 'dev-internal-service-key-change-me';
    registry.register(this);
  }

  async initiate(payment: RailPayment): Promise<RailInitiateResult> {
    const { data } = await axios.post(
      `${this.apiCoreUrl}/api/v1/transactions/transfer`,
      {
        receiverPhone: payment.metadata?.receiverPhone,
        amountMinor: payment.amountMinor,
        idempotencyKey: `rail-goursi-${payment.id}`,
      },
      { headers: { 'X-Service-Key': this.serviceKey } },
    );
    const status: RailPaymentStatus = data?.transaction?.status === 'SUCCEEDED' ? 'SUCCEEDED' : 'PROCESSING';
    return { railRef: payment.id, status };
  }

  async getStatus(railRef: string): Promise<RailPaymentStatus> {
    // lecture via api-core GET /transactions/:id (statut courant)
    const { data } = await axios.get(`${this.apiCoreUrl}/api/v1/transactions/${railRef}/receipt`, {
      headers: { 'X-Service-Key': this.serviceKey },
    });
    return this.mapStatus(data?.transaction?.status ?? data?.status);
  }

  async handleCallback(payload: RailCallbackPayload): Promise<RailPaymentStatus> {
    return this.mapStatus(payload.status);
  }

  async close(): Promise<void> {
    // rien à libérer (stateless)
  }

  private mapStatus(s?: string): RailPaymentStatus {
    switch (s) {
      case 'SUCCEEDED':
        return 'SUCCEEDED';
      case 'FAILED':
        return 'FAILED';
      case 'CANCELLED':
        return 'CANCELLED';
      case 'PROCESSING':
        return 'PROCESSING';
      default:
        return 'PENDING';
    }
  }
}
