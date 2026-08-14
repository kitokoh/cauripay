import type { FastifyInstance } from 'fastify';
import { db, qget, qrun } from '../db.js';
import { requireMerchant } from '../auth.js';
import { apiKeyHash, generateApiKey, generateWebhookSecret } from '../secrets.js';
import { ApiError, createPayment, listPayments, paymentToJson, transition, type PaymentRow, type CreatePaymentInput } from '../payments.js';
import { maskKey, toIso } from '../util.js';

interface MerchantRow {
  id: string;
  pk_test: string;
  sk_test_hash: string;
  pk_live: string;
  sk_live_hash: string;
  wsec_test: string;
  wsec_live: string;
  live_enabled: number;
}

export async function merchantRoutes(app: FastifyInstance): Promise<void> {
  // ---------- Clés API ----------
  // Les clés secrètes ne sont renvoyées qu'au marchand authentifié (JWT), comme Stripe.

  // Les clés sk_ sont hachées au repos : jamais renvoyées en clair ici.
  // pk_ publiques : affichables. wsec_ : masquées (en clair une seule fois à la création).
  app.get('/api/keys', { preHandler: requireMerchant }, async (req) => {
    const m = qget<MerchantRow>('SELECT * FROM merchants WHERE id = ?', req.merchantId)!;
    return {
      keys: {
        publishable_test: m.pk_test,
        publishable_live: m.pk_live,
        webhook_secret_test: maskKey(m.wsec_test),
        webhook_secret_live: maskKey(m.wsec_live),
        secret_test_present: true,
        secret_live_present: true,
      },
      live_enabled: m.live_enabled,
    };
  });

  app.post('/api/keys/rotate', { preHandler: requireMerchant }, async (req) => {
    const body = (req.body ?? {}) as { mode?: string; scope?: string };
    const mode = body.mode === 'live' ? 'live' : 'test';
    const scope = body.scope ?? 'secret';
    const m = qget<MerchantRow>('SELECT * FROM merchants WHERE id = ?', req.merchantId)!;

    if (scope === 'publishable') {
      const key = generateApiKey('pk', mode);
      qrun(`UPDATE merchants SET ${mode === 'test' ? 'pk_test' : 'pk_live'} = ?, updated_at = ? WHERE id = ?`, key, toIso(), m.id);
      return { key, scope, mode };
    }
    if (scope === 'webhook') {
      const secret = generateWebhookSecret(mode);
      qrun(`UPDATE merchants SET ${mode === 'test' ? 'wsec_test' : 'wsec_live'} = ?, updated_at = ? WHERE id = ?`, secret, toIso(), m.id);
      return { key: secret, scope, mode };
    }
    const key = generateApiKey('sk', mode);
    qrun(`UPDATE merchants SET ${mode === 'test' ? 'sk_test_hash' : 'sk_live_hash'} = ?, updated_at = ? WHERE id = ?`, apiKeyHash(key), toIso(), m.id);
    return { key, scope: 'secret', mode };
  });

  // ---------- Paiements (dashboard, session JWT marchand) ----------

  app.get('/api/payments', { preHandler: requireMerchant }, async (req) => {
    const q = req.query as { status?: string; limit?: string; before?: string };
    const { rows, hasMore } = listPayments(req.merchantId!, { status: q.status, limit: Number(q.limit) || 25, before: q.before });
    return { payments: rows.map(paymentToJson), has_more: hasMore };
  });

  app.get('/api/payments/:id', { preHandler: requireMerchant }, async (req) => {
    const { id } = req.params as { id: string };
    const row = qget<PaymentRow>('SELECT * FROM payments WHERE id = ? AND merchant_id = ?', id, req.merchantId);
    if (!row) throw new ApiError(404, 'not_found', 'Paiement introuvable.');
    return { payment: paymentToJson(row) };
  });

  app.post('/api/payments', { preHandler: requireMerchant }, async (req, reply) => {
    const input = (req.body ?? {}) as Partial<CreatePaymentInput>;
    const { payment, duplicate } = createPayment(req.merchantId!, 'test', input as CreatePaymentInput);
    reply.code(duplicate ? 200 : 201);
    return { payment: paymentToJson(payment), duplicate };
  });

  app.post('/api/payments/:id/cancel', { preHandler: requireMerchant }, async (req) => {
    const { id } = req.params as { id: string };
    const row = transition(req.merchantId!, id, 'cancelled');
    return { payment: paymentToJson(row) };
  });

  // ---------- Simulateur sandbox (dashboard JWT = sk_test du marchand) ----------

  app.post('/api/sandbox/payments/:id/approve', { preHandler: requireMerchant }, async (req) => {
    const { id } = req.params as { id: string };
    const pay = qget<PaymentRow>('SELECT * FROM payments WHERE id = ? AND merchant_id = ?', id, req.merchantId);
    if (!pay) throw new ApiError(404, 'not_found', 'Paiement introuvable.');
    if (pay.status === 'pending') transition(req.merchantId!, id, 'processing');
    const row = transition(req.merchantId!, id, 'succeeded', { providerRef: `SIM-${Math.random().toString(36).slice(2, 6).toUpperCase()}` });
    return { payment: paymentToJson(row) };
  });

  app.post('/api/sandbox/payments/:id/fail', { preHandler: requireMerchant }, async (req) => {
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as { reason?: string };
    const row = transition(req.merchantId!, id, 'failed', { reason: body.reason });
    return { payment: paymentToJson(row) };
  });

  app.post('/api/sandbox/payments/:id/expire', { preHandler: requireMerchant }, async (req) => {
    const { id } = req.params as { id: string };
    const row = transition(req.merchantId!, id, 'expired');
    return { payment: paymentToJson(row) };
  });

  // ---------- Statistiques ----------

  app.get('/api/stats', { preHandler: requireMerchant }, async (req) => {
    const merchantId = req.merchantId!;

    const totals = db
      .prepare(
        `SELECT COUNT(*) AS count,
                COALESCE(SUM(CASE WHEN status = 'succeeded' THEN amount_minor ELSE 0 END), 0) AS volume_minor,
                COALESCE(SUM(CASE WHEN status = 'succeeded' THEN 1 ELSE 0 END), 0) AS succeeded
         FROM payments WHERE merchant_id = ?`,
      )
      .get(merchantId) as { count: number; volume_minor: number; succeeded: number };

    const byDay: { date: string; count: number; volume_minor: number; succeeded: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
      const row = db
        .prepare(
          `SELECT COUNT(*) AS count,
                  COALESCE(SUM(CASE WHEN status = 'succeeded' THEN amount_minor ELSE 0 END), 0) AS volume_minor,
                  COALESCE(SUM(CASE WHEN status = 'succeeded' THEN 1 ELSE 0 END), 0) AS succeeded
           FROM payments WHERE merchant_id = ? AND substr(created_at, 1, 10) = ?`,
        )
        .get(merchantId, day) as { count: number; volume_minor: number; succeeded: number };
      byDay.push({ date: day, ...row });
    }

    const { rows } = listPayments(merchantId, { limit: 5 });

    return {
      totals: {
        count: totals.count,
        volume_minor: totals.volume_minor,
        success_rate: totals.count > 0 ? totals.succeeded / totals.count : 0,
      },
      by_day: byDay,
      recent: rows.map(paymentToJson),
    };
  });
}
