import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHmac, randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { DlxPublisher } from '../../amq/dlx-publisher.service';
import {
  ApiKeyStatus,
  Prisma,
  WebhookDeliveryStatus,
} from '../../../node_modules/.prisma/developer-gateway-client';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';

/** Backoff des retries webhook (pattern GOURSI-026d) : 1s, 5s, 30s, 5min — max 4 retries */
export const RETRY_BACKOFF_MS = [1_000, 5_000, 30_000, 300_000];
export const MAX_RETRIES = RETRY_BACKOFF_MS.length;

export const SIGNATURE_HEADER = 'X-Goursi-Signature';

export interface SandboxEvent {
  type: string;
  data: Record<string, unknown>;
}

export interface WebhookSenderResult {
  ok: boolean;
  status: number;
}

export interface WebhookSender {
  post(url: string, headers: Record<string, string>, body: string): Promise<WebhookSenderResult>;
}

/** Sender HTTP par défaut (fetch natif Node 20+) — injectable pour les tests. */
@Injectable()
export class DefaultWebhookSender implements WebhookSender {
  async post(url: string, headers: Record<string, string>, body: string): Promise<WebhookSenderResult> {
    const res = await fetch(url, { method: 'POST', headers, body });
    return { ok: res.ok, status: res.status };
  }
}

/**
 * Signature HMAC-SHA256 (pattern Stripe) : X-Goursi-Signature: t=<unix>,v1=<hex>.
 * Le message signé est "t.<payload>" — payload = corps JSON exact envoyé.
 */
export function computeSignature(secret: string, payload: string, timestampSec: number): string {
  const hmac = createHmac('sha256', secret).update(`${timestampSec}.${payload}`).digest('hex');
  return `t=${timestampSec},v1=${hmac}`;
}

/**
 * Webhooks sortants signés + retries (GOURSI-050c) :
 * dispatch vers les endpoints de la clé dont les événements correspondent,
 * signature HMAC-SHA256, retries backoff 1s/5s/30s/5min (max 4), persistance
 * WebhookDelivery, DLQ dead.letters/failed.webhooks après échec définitif.
 * Anti-SSRF : URLs locales / IP privées interdites (aligné issue #1).
 */
@Injectable()
export class WebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dlq: DlxPublisher,
    private readonly sender: WebhookSender,
  ) {}

  async create(apiKeyId: string, dto: CreateWebhookDto) {
    const apiKey = await this.prisma.apiKey.findUnique({ where: { id: apiKeyId } });
    if (!apiKey || apiKey.status !== ApiKeyStatus.ACTIVE) {
      throw new NotFoundException({ code: 'API_KEY_NOT_FOUND', message: 'Clé API introuvable' });
    }
    assertSafeWebhookUrl(dto.url);
    const endpoint = await this.prisma.webhookEndpoint.create({
      data: {
        apiKeyId,
        url: dto.url,
        secret: randomBytes(16).toString('hex'), // hex 32
        events: dto.events,
        active: true,
      },
    });
    return {
      id: endpoint.id,
      url: endpoint.url,
      events: endpoint.events,
      secret: endpoint.secret, // retourné UNE seule fois (création)
      active: endpoint.active,
      createdAt: endpoint.createdAt,
    };
  }

  async list(apiKeyId: string) {
    const endpoints = await this.prisma.webhookEndpoint.findMany({
      where: { apiKeyId },
      orderBy: { createdAt: 'desc' },
    });
    // jamais le secret en liste — il n'est montré qu'à la création
    return endpoints.map(({ id, url, events, active, createdAt, updatedAt }) => ({
      id,
      url,
      events,
      active,
      createdAt,
      updatedAt,
    }));
  }

  async get(apiKeyId: string, id: string) {
    const endpoint = await this.requireEndpoint(apiKeyId, id);
    const { secret: _secret, ...rest } = endpoint;
    return rest;
  }

  async update(apiKeyId: string, id: string, dto: UpdateWebhookDto) {
    const endpoint = await this.requireEndpoint(apiKeyId, id);
    if (dto.url !== undefined) {
      assertSafeWebhookUrl(dto.url);
    }
    return this.prisma.webhookEndpoint.update({
      where: { id: endpoint.id },
      data: { url: dto.url, events: dto.events, active: dto.active },
    });
  }

  async remove(apiKeyId: string, id: string) {
    const endpoint = await this.requireEndpoint(apiKeyId, id);
    await this.prisma.webhookEndpoint.delete({ where: { id: endpoint.id } });
    return { id: endpoint.id, deleted: true };
  }

  /** Dispatch d'un événement sandbox vers les endpoints correspondants de la clé. */
  async dispatchEvent(apiKeyId: string, event: SandboxEvent): Promise<{ matched: number }> {
    const endpoints = await this.prisma.webhookEndpoint.findMany({
      where: { apiKeyId, active: true },
    });
    const matching = endpoints.filter((ep) => matchesEvents(ep.events, event.type));
    for (const ep of matching) {
      const delivery = await this.prisma.webhookDelivery.create({
        data: {
          endpointId: ep.id,
          eventType: event.type,
          payload: event.data as unknown as Prisma.InputJsonValue,
          signature: '',
          status: WebhookDeliveryStatus.PENDING,
        },
      });
      await this.attemptDelivery(delivery.id);
    }
    return { matched: matching.length };
  }

  /** Tente la livraison ; échec → retry backoff ou DLQ après MAX_RETRIES échecs. */
  async attemptDelivery(deliveryId: string): Promise<void> {
    const delivery = await this.prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { endpoint: true },
    });
    if (!delivery) {
      return;
    }
    const endpoint = delivery.endpoint;
    const payload = JSON.stringify({
      id: delivery.id,
      type: delivery.eventType,
      data: delivery.payload,
      timestamp: delivery.createdAt.toISOString(),
    });
    const t = Math.floor(Date.now() / 1000);
    const signature = computeSignature(endpoint.secret, payload, t);

    let ok = false;
    let lastError: string | undefined;
    try {
      const result = await this.sender.post(
        endpoint.url,
        { 'Content-Type': 'application/json', [SIGNATURE_HEADER]: signature, 'User-Agent': 'goursi-webhooks/0.1' },
        payload,
      );
      ok = result.ok;
      if (!ok) {
        lastError = `HTTP ${result.status}`;
      }
    } catch (e) {
      lastError = (e as Error).message ?? 'Network error';
    }

    const attempts = delivery.attempts + 1;
    if (ok) {
      await this.prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: { status: WebhookDeliveryStatus.SENT, attempts, signature },
      });
      return;
    }

    if (attempts > MAX_RETRIES) {
      // Échec définitif → DLQ dead.letters/failed.webhooks (pattern GOURSI-026d)
      await this.prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: { status: WebhookDeliveryStatus.FAILED, attempts, signature, lastError },
      });
      await this.dlq.publish({
        deliveryId,
        endpointId: endpoint.id,
        eventType: delivery.eventType,
        lastError,
        attempts,
      });
      return;
    }

    const delayMs = RETRY_BACKOFF_MS[attempts - 1];
    const nextRetryAt = new Date(Date.now() + delayMs);
    await this.prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: WebhookDeliveryStatus.PENDING,
        attempts,
        signature,
        lastError,
        nextRetryAt,
      },
    });
    setTimeout(() => {
      void this.attemptDelivery(deliveryId);
    }, delayMs);
  }

  private async requireEndpoint(apiKeyId: string, id: string) {
    const endpoint = await this.prisma.webhookEndpoint.findUnique({ where: { id } });
    if (!endpoint || endpoint.apiKeyId !== apiKeyId) {
      throw new NotFoundException({ code: 'WEBHOOK_NOT_FOUND', message: 'Endpoint webhook introuvable' });
    }
    return endpoint;
  }
}

function matchesEvents(events: unknown, type: string): boolean {
  return Array.isArray(events) && (events.includes(type) || events.includes('*'));
}

/**
 * Anti-SSRF (aligné issue #1) : interdiction des URLs locales / IP privées
 * (127.0.0.0/8, 10/8, 172.16/12, 192.168/16, 169.254/16, ::1, fc00::/7, fe80::/10,
 * localhost, *.local, *.internal). Déterministe — pas de résolution DNS.
 */
export function assertSafeWebhookUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new BadRequestException({ code: 'SSRF_URL_FORBIDDEN', message: 'URL invalide' });
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BadRequestException({ code: 'SSRF_URL_FORBIDDEN', message: 'Protocole non supporté' });
  }
  const host = parsed.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    throw new BadRequestException({ code: 'SSRF_URL_FORBIDDEN', message: 'URL locale/interne interdite' });
  }
  if (isPrivateIpLiteral(host)) {
    throw new BadRequestException({ code: 'SSRF_URL_FORBIDDEN', message: 'IP privée interdite' });
  }
}

function isPrivateIpLiteral(host: string): boolean {
  if (host.includes(':')) {
    // IPv6 : loopback, lien-local, ULA
    const lower = host.replace(/^\[|\]$/g, '');
    return (
      lower === '::1' ||
      lower.startsWith('fe80:') ||
      lower.startsWith('fc') ||
      lower.startsWith('fd') ||
      lower === '::'
    );
  }
  const parts = host.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
    return false; // hostname non-IP → géré par la liste de noms locaux
  }
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}
