import type { FastifyInstance, FastifyRequest } from 'fastify';
import { requireApiKey } from '../auth.js';
import { config } from '../config.js';
import { ApiError, createPayment, getPayment, listPayments, paymentToJson, transition } from '../payments.js';
import { CURRENCIES, METHODS } from '../registries.js';

/** Clé de bucket du rate limit : la clé API elle-même (issue #3). */
function apiKeyBucket(req: FastifyRequest): string {
  const h = req.headers.authorization ?? '';
  return h.startsWith('Bearer ') ? h.slice(7).trim() : req.ip;
}

export async function paymentsApiRoutes(app: FastifyInstance): Promise<void> {
  // Toutes les routes /api/v1/* exigent une clé API (sk_/pk_) et sont limitées PAR CLÉ.
  const keyed = {
    preHandler: requireApiKey,
    config: {
      rateLimit: {
        max: config.rateLimitPerKey,
        timeWindow: '1 minute',
        keyGenerator: apiKeyBucket,
      },
    },
  };

  // ---------- Paiements ----------

  app.post('/api/v1/payments', keyed, async (req, reply) => {
    const ctx = req.apiKey!;
    const input = (req.body ?? {}) as Parameters<typeof createPayment>[2];
    const { payment, duplicate } = createPayment(ctx.merchantId, ctx.mode, input);
    reply.code(duplicate ? 200 : 201);
    return { payment: paymentToJson(payment), duplicate };
  });

  app.get('/api/v1/payments', keyed, async (req) => {
    const ctx = req.apiKey!;
    const q = req.query as { status?: string; limit?: string; before?: string };
    const { rows, hasMore } = listPayments(ctx.merchantId, { status: q.status, limit: Number(q.limit) || 25, before: q.before });
    return { payments: rows.map(paymentToJson), has_more: hasMore };
  });

  app.get('/api/v1/payments/:id', keyed, async (req) => {
    const ctx = req.apiKey!;
    const { id } = req.params as { id: string };
    const row = getPayment(ctx.merchantId, id);
    if (!row) throw new ApiError(404, 'not_found', 'Paiement introuvable.');
    return { payment: paymentToJson(row) };
  });

  app.post('/api/v1/payments/:id/cancel', keyed, async (req) => {
    const ctx = req.apiKey!;
    const { id } = req.params as { id: string };
    const row = transition(ctx.merchantId, id, 'cancelled');
    return { payment: paymentToJson(row) };
  });

  // ---------- Simulateur sandbox (sk_test uniquement) ----------

  const sandboxOnly = {
    preHandler: async (req: Parameters<typeof requireApiKey>[0], reply: Parameters<typeof requireApiKey>[1]) => {
      const ctx = await requireApiKey(req, reply);
      if (!ctx) return;
      if (ctx.scope !== 'secret' || ctx.mode !== 'test') {
        reply.code(403).send({ error: { type: 'permission_error', code: 'sandbox_test_only', message: 'Le simulateur exige une clé secrète de test (sk_test_*).' } });
      }
    },
    config: {
      rateLimit: {
        max: config.rateLimitPerKey,
        timeWindow: '1 minute',
        keyGenerator: apiKeyBucket,
      },
    },
  };

  app.post('/api/v1/sandbox/payments/:id/approve', sandboxOnly, async (req) => {
    const ctx = req.apiKey!;
    const { id } = req.params as { id: string };
    const pay = getPayment(ctx.merchantId, id);
    if (!pay) throw new ApiError(404, 'not_found', 'Paiement introuvable.');
    if (pay.status === 'pending') transition(ctx.merchantId, id, 'processing');
    const row = transition(ctx.merchantId, id, 'succeeded', { providerRef: `SIM-${Math.random().toString(36).slice(2, 6).toUpperCase()}` });
    return { payment: paymentToJson(row) };
  });

  app.post('/api/v1/sandbox/payments/:id/fail', sandboxOnly, async (req) => {
    const ctx = req.apiKey!;
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as { reason?: string };
    const row = transition(ctx.merchantId, id, 'failed', { reason: body.reason });
    return { payment: paymentToJson(row) };
  });

  app.post('/api/v1/sandbox/payments/:id/expire', sandboxOnly, async (req) => {
    const ctx = req.apiKey!;
    const { id } = req.params as { id: string };
    const row = transition(ctx.merchantId, id, 'expired');
    return { payment: paymentToJson(row) };
  });

  // ---------- Registres (publics) ----------

  app.get('/api/v1/methods', async () => ({ methods: METHODS }));
  app.get('/api/v1/currencies', async () => ({ currencies: CURRENCIES }));
}
