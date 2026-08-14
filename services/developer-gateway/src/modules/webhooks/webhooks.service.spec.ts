import { createHmac } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';
import {
  MAX_RETRIES,
  RETRY_BACKOFF_MS,
  SIGNATURE_HEADER,
  WebhooksService,
  computeSignature,
  assertSafeWebhookUrl,
  WebhookSender,
} from './webhooks.service';

type Row = Record<string, unknown> & { id: string };

/** Fake Prisma (mémoire) pour WebhookEndpoint + WebhookDelivery. */
class FakePrisma {
  endpoints: Row[] = [];
  deliveries: Row[] = [];
  private seq = 1;

  apiKey = {
    findUnique: async (args: { where: Record<string, unknown> }) => {
      return { id: args.where.id, status: 'ACTIVE' };
    },
  };

  webhookEndpoint = {
    create: async (args: { data: Record<string, unknown> }) => {
      const row: Row = { id: `ep_${this.seq++}`, ...args.data, createdAt: new Date(), updatedAt: new Date() };
      this.endpoints.push(row);
      return row;
    },
    findMany: async (args: { where: Record<string, unknown> }) => {
      return this.endpoints.filter((r) =>
        Object.entries(args.where).every(([k, v]) => r[k] === v),
      );
    },
    findUnique: async (args: { where: Record<string, unknown> }) => {
      return this.endpoints.find((r) => r.id === args.where.id) ?? null;
    },
    update: async (args: { where: { id: string }; data: Record<string, unknown> }) => {
      const row = this.endpoints.find((r) => r.id === args.where.id)!;
      Object.assign(row, args.data);
      return row;
    },
    delete: async (args: { where: { id: string } }) => {
      const idx = this.endpoints.findIndex((r) => r.id === args.where.id);
      return this.endpoints.splice(idx, 1)[0];
    },
  };

  webhookDelivery = {
    create: async (args: { data: Record<string, unknown> }) => {
      // miroir des @default du schéma Prisma (attempts 0, status PENDING…)
      const row: Row = {
        id: `dlv_${this.seq++}`,
        attempts: 0,
        status: 'PENDING',
        nextRetryAt: null,
        lastError: null,
        signature: '',
        ...args.data,
        createdAt: new Date(),
      };
      this.deliveries.push(row);
      return row;
    },
    findUnique: async (args: { where: Record<string, unknown>; include?: { endpoint: boolean } }) => {
      const row = this.deliveries.find((r) => r.id === args.where.id);
      if (!row) return null;
      if (args.include?.endpoint) {
        return { ...row, endpoint: this.endpoints.find((e) => e.id === row.endpointId) };
      }
      return row;
    },
    update: async (args: { where: { id: string }; data: Record<string, unknown> }) => {
      const row = this.deliveries.find((r) => r.id === args.where.id)!;
      Object.assign(row, args.data);
      return row;
    },
  };
}

function makeSender(overrides?: Partial<WebhookSender>) {
  const calls: Array<{ url: string; headers: Record<string, string>; body: string }> = [];
  const sender: WebhookSender = {
    post: async (url, headers, body) => {
      calls.push({ url, headers, body });
      return { ok: true, status: 200 };
    },
    ...overrides,
  };
  return { sender, calls };
}

function makeService(prisma: FakePrisma, sender: WebhookSender) {
  const dlq = { publish: jest.fn().mockResolvedValue(undefined) };
  const service = new WebhooksService(prisma as never, dlq as never, sender);
  return { service, dlq };
}

const ENDPOINT_SECRET = '0123456789abcdef0123456789abcdef';

describe('WebhooksService (GOURSI-050c) — signature, retries, dispatch', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  describe('computeSignature — vecteur connu HMAC-SHA256', () => {
    it('vecteur spec : t.payload signé en hex (t=...,v1=...)', () => {
      const payload = '{"type":"payment.succeeded","data":{"id":"sandbox_1"}}';
      const t = 1700000000;
      expect(computeSignature(ENDPOINT_SECRET, payload, t)).toBe(
        `t=1700000000,v1=8e323643ef7804f4d59e945234279f63603e273350c45e6f58bf9b25a9de3ba1`,
      );
    });

    it('vecteur indépendant (secret/payload fixes)', () => {
      const secret = 'test-secret-0123456789abcdef';
      const payload = '{"hello":"world"}';
      const t = 1700000000;
      const expected = createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex');
      expect(computeSignature(secret, payload, t)).toBe(`t=1700000000,v1=${expected}`);
      expect(computeSignature(secret, payload, t)).toBe(
        't=1700000000,v1=8fab1c1510af8ce9528f73b97fe349ff3196ae4596d2d058cf4bd7860d034a5d',
      );
    });

    it('deux payloads différents → signatures différentes (même t)', () => {
      const t = 1700000000;
      const a = computeSignature(ENDPOINT_SECRET, '{"a":1}', t);
      const b = computeSignature(ENDPOINT_SECRET, '{"a":2}', t);
      expect(a).not.toBe(b);
    });
  });

  describe('retry backoff (pattern GOURSI-026d)', () => {
    it('schéma 1s/5s/30s/5min — max 4 retries', () => {
      expect(RETRY_BACKOFF_MS).toEqual([1_000, 5_000, 30_000, 300_000]);
      expect(MAX_RETRIES).toBe(4);
    });

    it('échec définitif après 5 tentatives (1 + 4 retries) → FAILED + DLQ failed.webhooks', async () => {
      jest.useFakeTimers();
      const prisma = new FakePrisma();
      await prisma.webhookEndpoint.create({
        data: { apiKeyId: 'sk-row-1', url: 'https://hook.example.com/end', secret: ENDPOINT_SECRET, events: ['payment.succeeded'], active: true },
      });
      const { sender } = makeSender({ post: async () => ({ ok: false, status: 500 }) });
      const { service, dlq } = makeService(prisma, sender);

      const delivery = await prisma.webhookDelivery.create({
        data: { endpointId: 'ep_1', eventType: 'payment.succeeded', payload: { id: 'x' }, signature: '', status: 'PENDING' },
      });

      for (let i = 0; i < 5; i++) {
        await service.attemptDelivery(delivery.id);
      }

      const final = prisma.deliveries.find((d) => d.id === delivery.id)!;
      expect(final.status).toBe('FAILED');
      expect(final.attempts).toBe(5);
      expect(final.lastError).toBe('HTTP 500');
      expect(dlq.publish).toHaveBeenCalledTimes(1);
      expect(dlq.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          deliveryId: delivery.id,
          endpointId: 'ep_1',
          eventType: 'payment.succeeded',
          attempts: 5,
          lastError: 'HTTP 500',
        }),
      );
    });
  });

  describe('dispatch', () => {
    it('succès → delivery SENT avec signature vérifiable et header X-Goursi-Signature', async () => {
      jest.useFakeTimers();
      const prisma = new FakePrisma();
      await prisma.webhookEndpoint.create({
        data: { apiKeyId: 'sk-row-1', url: 'https://hook.example.com/end', secret: ENDPOINT_SECRET, events: ['payment.succeeded'], active: true },
      });
      const { sender, calls } = makeSender();
      const { service } = makeService(prisma, sender);

      const result = await service.dispatchEvent('sk-row-1', {
        type: 'payment.succeeded',
        data: { id: 'sandbox_1', status: 'APPROVED' },
      });

      expect(result.matched).toBe(1);
      expect(calls).toHaveLength(1);
      expect(calls[0].url).toBe('https://hook.example.com/end');

      const signature = calls[0].headers[SIGNATURE_HEADER];
      const match = signature.match(/^t=(\d+),v1=([0-9a-f]{64})$/);
      expect(match).not.toBeNull();
      const t = Number(match![1]);
      const v1 = match![2];
      const body = calls[0].body;
      // re-calcul HMAC : le v1 doit correspondre au corps exact envoyé
      expect(v1).toBe(createHmac('sha256', ENDPOINT_SECRET).update(`${t}.${body}`).digest('hex'));
      expect(calls[0].headers['Content-Type']).toBe('application/json');

      const delivery = prisma.deliveries[0];
      expect(delivery.status).toBe('SENT');
      expect(delivery.attempts).toBe(1);
      expect(delivery.signature).toBe(signature);
    });

    it('seuls les endpoints dont les événements correspondent reçoivent l’événement', async () => {
      const prisma = new FakePrisma();
      await prisma.webhookEndpoint.create({
        data: { apiKeyId: 'sk-row-1', url: 'https://a.example.com/h', secret: ENDPOINT_SECRET, events: ['payment.succeeded'], active: true },
      });
      await prisma.webhookEndpoint.create({
        data: { apiKeyId: 'sk-row-1', url: 'https://b.example.com/h', secret: ENDPOINT_SECRET, events: ['payment.failed'], active: true },
      });
      await prisma.webhookEndpoint.create({
        data: { apiKeyId: 'sk-row-1', url: 'https://c.example.com/h', secret: ENDPOINT_SECRET, events: ['*'], active: true },
      });
      const { sender, calls } = makeSender();
      const { service } = makeService(prisma, sender);

      const result = await service.dispatchEvent('sk-row-1', { type: 'payment.failed', data: {} });

      expect(result.matched).toBe(2); // b (explicite) + c (wildcard)
      expect(calls.map((c) => c.url)).toEqual(['https://b.example.com/h', 'https://c.example.com/h']);
    });

    it('endpoint inactif ignoré', async () => {
      const prisma = new FakePrisma();
      await prisma.webhookEndpoint.create({
        data: { apiKeyId: 'sk-row-1', url: 'https://a.example.com/h', secret: ENDPOINT_SECRET, events: ['payment.succeeded'], active: false },
      });
      const { sender } = makeSender();
      const { service } = makeService(prisma, sender);
      const result = await service.dispatchEvent('sk-row-1', { type: 'payment.succeeded', data: {} });
      expect(result.matched).toBe(0);
    });

    it('retry programmé avec nextRetryAt = now + backoff après un premier échec', async () => {
      jest.useFakeTimers();
      const prisma = new FakePrisma();
      await prisma.webhookEndpoint.create({
        data: { apiKeyId: 'sk-row-1', url: 'https://hook.example.com/end', secret: ENDPOINT_SECRET, events: ['payment.succeeded'], active: true },
      });
      const { sender } = makeSender({ post: async () => ({ ok: false, status: 503 }) });
      const { service } = makeService(prisma, sender);

      const delivery = await prisma.webhookDelivery.create({
        data: { endpointId: 'ep_1', eventType: 'payment.succeeded', payload: { id: 'x' }, signature: '', status: 'PENDING' },
      });
      await service.attemptDelivery(delivery.id);

      const row = prisma.deliveries[0];
      expect(row.status).toBe('PENDING');
      expect(row.attempts).toBe(1);
      expect(row.lastError).toBe('HTTP 503');
      expect(row.nextRetryAt).toBeInstanceOf(Date);
      // 1er retry → backoff 1s
      expect((row.nextRetryAt as Date).getTime() - Date.now()).toBe(1_000);
    });
  });

  describe('création d’endpoint', () => {
    it('secret hex 32 généré et retourné UNE seule fois (pas dans la liste)', async () => {
      const prisma = new FakePrisma();
      const { sender } = makeSender();
      const { service } = makeService(prisma, sender);

      const created = await service.create('sk-row-1', { url: 'https://hook.example.com/end', events: ['payment.succeeded'] });
      expect(created.secret).toMatch(/^[0-9a-f]{32}$/);

      const list = await service.list('sk-row-1');
      expect(list).toHaveLength(1);
      expect(JSON.stringify(list)).not.toContain(created.secret);
    });
  });

  describe('anti-SSRF (aligné issue #1)', () => {
    it.each([
      'http://localhost:8000/hook',
      'https://127.0.0.1/hook',
      'http://10.0.0.5/hook',
      'http://192.168.1.10/hook',
      'http://172.16.4.1/hook',
      'http://169.254.169.254/latest/meta-data',
      'http://[::1]:3000/hook',
      'http://app.internal/hook',
      'ftp://example.com/hook',
    ])('refuse %s', async (url) => {
      const prisma = new FakePrisma();
      const { sender } = makeSender();
      const { service } = makeService(prisma, sender);
      await expect(
        service.create('sk-row-1', { url, events: ['payment.succeeded'] }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.create('sk-row-1', { url, events: ['payment.succeeded'] }),
      ).rejects.toMatchObject({ response: { code: 'SSRF_URL_FORBIDDEN' } });
    });

    it('accepte une URL publique https', async () => {
      const prisma = new FakePrisma();
      const { sender } = makeSender();
      const { service } = makeService(prisma, sender);
      const created = await service.create('sk-row-1', { url: 'https://hooks.example.com/payment', events: ['payment.succeeded'] });
      expect(created.id).toBeTruthy();
    });

    it('assertSafeWebhookUrl — unitaire', () => {
      expect(() => assertSafeWebhookUrl('http://192.168.0.1/x')).toThrow(BadRequestException);
      expect(() => assertSafeWebhookUrl('https://example.com/x')).not.toThrow();
    });
  });
});
