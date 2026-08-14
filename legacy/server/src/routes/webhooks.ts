import type { FastifyInstance } from 'fastify';
import { db, qall, qget, qrun } from '../db.js';
import { newId } from '../ids.js';
import { requireMerchant } from '../auth.js';
import { ApiError } from '../payments.js';
import { config } from '../config.js';
import { replayLastEvent, sendTestPing, type WebhookRow } from '../webhooks.js';
import { isSafeWebhookUrl, parseJson, toIso } from '../util.js';

const EVENT_TYPES = ['payment.created', 'payment.processing', 'payment.succeeded', 'payment.failed', 'payment.cancelled', 'payment.expired'];

function webhookJson(w: WebhookRow): Record<string, unknown> {
  return {
    id: w.id,
    url: w.url,
    events: parseJson<string[]>(w.events, ['*']),
    mode: w.mode,
    active: w.active,
    created_at: w.created_at,
  };
}

export async function webhookRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/webhooks', { preHandler: requireMerchant }, async (req) => {
    const rows = qall<WebhookRow>('SELECT * FROM webhooks WHERE merchant_id = ? ORDER BY created_at DESC', req.merchantId);
    return { webhooks: rows.map(webhookJson) };
  });

  app.post('/api/webhooks', { preHandler: requireMerchant }, async (req, reply) => {
    const body = (req.body ?? {}) as { url?: string; events?: string[]; mode?: string };
    const url = body.url?.trim();
    if (!url || !/^https?:\/\//.test(url)) throw new ApiError(400, 'invalid_request_error', 'url doit être une URL http(s) valide.');
    if (url.length > 500) throw new ApiError(400, 'invalid_request_error', 'url trop longue (max 500).');

    const events = body.events && body.events.length > 0 ? body.events : ['*'];
    const validTypes = [...EVENT_TYPES, '*'];
    if (events.some((e) => !validTypes.includes(e))) {
      throw new ApiError(400, 'invalid_request_error', `Événements invalides. Valides : ${validTypes.join(', ')}`);
    }
    const mode = body.mode === 'live' ? 'live' : 'test';

    // Limite par marchand (anti-spam) + validation URL (anti-SSRF amont).
    const count = qget<{ c: number }>('SELECT COUNT(*) AS c FROM webhooks WHERE merchant_id = ? AND mode = ?', req.merchantId, mode);
    if ((count?.c ?? 0) >= config.maxWebhooksPerMerchant) {
      throw new ApiError(400, 'webhook_limit_exceeded', `Maximum ${config.maxWebhooksPerMerchant} webhooks par compte (mode ${mode}).`);
    }
    const urlCheck = await isSafeWebhookUrl(url, { blockPrivate: config.blockPrivateWebhookUrls, requireHttps: config.requireHttpsWebhooks });
    if (!urlCheck.ok) throw new ApiError(400, 'invalid_webhook_url', urlCheck.reason ?? 'URL de webhook invalide.');

    const now = toIso();

    const secretCol = mode === 'test' ? 'wsec_test' : 'wsec_live';
    const merchant = qget<{ s: string }>(`SELECT ${secretCol} AS s FROM merchants WHERE id = ?`, req.merchantId)!;

    const id = newId('wh');
    qrun('INSERT INTO webhooks (id, merchant_id, url, events, mode, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)', id, req.merchantId, url, JSON.stringify(events), mode, now, now);

    const wh = qget<WebhookRow>('SELECT * FROM webhooks WHERE id = ?', id)!;
    reply.code(201);
    return { webhook: webhookJson(wh), webhook_secret: merchant.s, message: 'Secret de signature renvoyé une seule fois — configurez-le sur votre endpoint.' };
  });

  app.patch('/api/webhooks/:id', { preHandler: requireMerchant }, async (req) => {
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as { active?: number };
    const wh = qget<WebhookRow>('SELECT * FROM webhooks WHERE id = ? AND merchant_id = ?', id, req.merchantId)!;
    if (!wh) throw new ApiError(404, 'not_found', 'Webhook introuvable.');
    qrun('UPDATE webhooks SET active = ?, updated_at = ? WHERE id = ?', body.active ? 1 : 0, toIso(), id);
    const fresh = qget<WebhookRow>('SELECT * FROM webhooks WHERE id = ?', id)!;
    return { webhook: webhookJson(fresh) };
  });

  app.delete('/api/webhooks/:id', { preHandler: requireMerchant }, async (req) => {
    const { id } = req.params as { id: string };
    const res = qrun('DELETE FROM webhooks WHERE id = ? AND merchant_id = ?', id, req.merchantId);
    if (res.changes === 0) throw new ApiError(404, 'not_found', 'Webhook introuvable.');
    return { ok: true };
  });

  app.get('/api/webhooks/:id/attempts', { preHandler: requireMerchant }, async (req) => {
    const { id } = req.params as { id: string };
    const wh = qget('SELECT * FROM webhooks WHERE id = ? AND merchant_id = ?', id, req.merchantId);
    if (!wh) throw new ApiError(404, 'not_found', 'Webhook introuvable.');
    const rows = db
      .prepare('SELECT * FROM webhook_attempts WHERE webhook_id = ? ORDER BY created_at DESC LIMIT 50')
      .all(id);
    return {
      attempts: rows.map((a) => ({
        id: (a as { id: string }).id,
        event_type: (a as { event_type: string }).event_type,
        payload: parseJson<Record<string, unknown>>((a as { payload: string }).payload, {}),
        signature: (a as { signature: string }).signature,
        status: (a as { status: string }).status,
        http_status: (a as { http_status: number | null }).http_status,
        attempts: (a as { attempts: number }).attempts,
        last_error: (a as { last_error: string | null }).last_error,
        created_at: (a as { created_at: string }).created_at,
        delivered_at: (a as { delivered_at: string | null }).delivered_at,
      })),
    };
  });

  app.post('/api/webhooks/:id/replay', { preHandler: requireMerchant }, async (req) => {
    const { id } = req.params as { id: string };
    const wh = qget('SELECT * FROM webhooks WHERE id = ? AND merchant_id = ?', id, req.merchantId);
    if (!wh) throw new ApiError(404, 'not_found', 'Webhook introuvable.');
    const attemptId = await replayLastEvent(id);
    return { ok: true, attempt_id: attemptId };
  });

  app.post('/api/webhooks/:id/test', { preHandler: requireMerchant }, async (req) => {
    const { id } = req.params as { id: string };
    const wh = qget('SELECT * FROM webhooks WHERE id = ? AND merchant_id = ?', id, req.merchantId);
    if (!wh) throw new ApiError(404, 'not_found', 'Webhook introuvable.');
    const attemptId = await sendTestPing(id);
    return { ok: true, attempt_id: attemptId };
  });
}
