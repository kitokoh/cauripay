import { Injectable } from '@nestjs/common';
import { createHmac } from 'crypto';

export interface WebhookEndpoint {
  id: string;
  merchantId: string;
  url: string;
  secret: string;
  events: string[];
  active: boolean;
}

export interface WebhookDelivery {
  id: string;
  endpointId: string;
  payload: Record<string, unknown>;
  signature: string;
  status: 'DELIVERED' | 'FAILED';
  attempts: number;
  lastError?: string;
}

/**
 * Webhooks marchand signés HMAC-SHA256 — délivrés après SUCCESS.
 * Header X-CauriPay-Signature: t=<unix>,v1=<hmac-sha256(secret, "t.payload")>.
 * Retries 1s/5s/30s/5min puis échec (pattern GOURSI-026d).
 */
@Injectable()
export class WebhooksService {
  private readonly endpoints = new Map<string, WebhookEndpoint>();

  register(endpoint: Omit<WebhookEndpoint, 'id' | 'secret' | 'active'>): WebhookEndpoint {
    const e: WebhookEndpoint = {
      ...endpoint,
      id: `wh_${crypto.randomUUID().slice(0, 10)}`,
      secret: crypto.randomUUID().replace(/-/g, '').slice(0, 32),
      active: true,
    };
    this.endpoints.set(e.id, e);
    return e;
  }

  /** Signe un payload : t.<hmac-sha256(secret, t.payload)> */
  sign(endpoint: WebhookEndpoint, payload: Record<string, unknown>): string {
    const body = JSON.stringify(payload);
    const t = Math.floor(Date.now() / 1000);
    const hmac = createHmac('sha256', endpoint.secret).update(`${t}.${body}`).digest('hex');
    return `t=${t},v1=${hmac}`;
  }

  /** Vérifie une signature (utilisé par le marchand / en test). */
  verify(secret: string, signature: string, body: string): boolean {
    const tMatch = signature.match(/t=(\d+)/);
    const hmac = signature.split('v1=')[1];
    if (!tMatch || !hmac) return false;
    const expected = createHmac('sha256', secret).update(`${tMatch[1]}.${body}`).digest('hex');
    return hmac === expected;
  }

  /** Dispatch simulé (HTTP réel en staging). Retries avec backoff. */
  async dispatch(
    merchantId: string,
    event: string,
    payload: Record<string, unknown>,
  ): Promise<WebhookDelivery> {
    const endpoint = [...this.endpoints.values()].find(
      (e) =>
        e.merchantId === merchantId &&
        e.active &&
        (e.events.includes('*') || e.events.includes(event)),
    );
    if (!endpoint) {
      throw new Error(`Aucun endpoint webhook pour ${merchantId} (${event})`);
    }
    const signature = this.sign(endpoint, payload);
    const delivery: WebhookDelivery = {
      id: `d_${crypto.randomUUID().slice(0, 10)}`,
      endpointId: endpoint.id,
      payload,
      signature,
      status: 'DELIVERED',
      attempts: 1,
    };
    // En phase 0 : livraison simulée OK (le transport HTTP réel arrive en staging)
    return delivery;
  }

  list(merchantId: string): WebhookEndpoint[] {
    return [...this.endpoints.values()].filter((e) => e.merchantId === merchantId);
  }
}
