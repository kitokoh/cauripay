import { Injectable } from '@nestjs/common';
import { createHmac, randomUUID } from 'crypto';

export interface DevWebhookEndpoint {
  id: string;
  developerId: string;
  url: string;
  secret: string;
  events: string[];
  active: boolean;
}

/**
 * Webhooks sortants signés HMAC-SHA256 (GOURSI-050c).
 * Header : X-Goursi-Signature: t=<unix>,v1=<hmac-sha256(secret, "t.payload")>.
 * Anti-SSRF : l'URL est validée (HTTPS, pas d'IP privée) — aligné issue #1.
 */
@Injectable()
export class DevWebhooksService {
  private readonly endpoints = new Map<string, DevWebhookEndpoint>();

  register(developerId: string, dto: { url: string; events: string[] }): DevWebhookEndpoint {
    this.assertSafeUrl(dto.url);
    const endpoint: DevWebhookEndpoint = {
      id: `dwh_${randomUUID().slice(0, 12)}`,
      developerId,
      url: dto.url,
      secret: randomUUID().replace(/-/g, '').slice(0, 32),
      events: dto.events,
      active: true,
    };
    this.endpoints.set(endpoint.id, endpoint);
    return endpoint;
  }

  sign(endpoint: DevWebhookEndpoint, payload: Record<string, unknown>): string {
    const body = JSON.stringify(payload);
    const t = Math.floor(Date.now() / 1000);
    const hmac = createHmac('sha256', endpoint.secret).update(`${t}.${body}`).digest('hex');
    return `t=${t},v1=${hmac}`;
  }

  verify(secret: string, signature: string, body: string): boolean {
    const tMatch = signature.match(/t=(\d+)/);
    const hmac = signature.split('v1=')[1];
    if (!tMatch || !hmac) return false;
    // anti-replay ±5 min
    const t = Number(tMatch[1]);
    if (Math.abs(Date.now() / 1000 - t) > 300) return false;
    const expected = createHmac('sha256', secret).update(`${t}.${body}`).digest('hex');
    return hmac === expected;
  }

  list(developerId: string): DevWebhookEndpoint[] {
    return [...this.endpoints.values()].filter((e) => e.developerId === developerId);
  }

  /** Anti-SSRF : HTTPS uniquement + pas d'IP privée/réservée. */
  private assertSafeUrl(url: string) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error('URL invalide');
    }
    if (parsed.protocol !== 'https:') throw new Error('HTTPS requis');
    const host = parsed.hostname;
    const isPrivate =
      host === 'localhost' ||
      host.endsWith('.local') ||
      /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) ||
      host === '127.0.0.1' ||
      host === '::1';
    if (isPrivate) throw new Error('URL privée interdite (anti-SSRF)');
  }
}
