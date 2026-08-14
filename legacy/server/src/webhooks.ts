import { createHmac } from 'node:crypto';
import { db, qall, qget, qrun } from './db.js';
import { config } from './config.js';
import { newId } from './ids.js';
import { isSafeWebhookUrl, parseJson, toIso } from './util.js';

export interface WebhookRow {
  id: string;
  merchant_id: string;
  url: string;
  events: string;
  mode: 'test' | 'live';
  active: number;
  created_at: string;
  updated_at: string;
}

export interface AttemptRow {
  id: string;
  webhook_id: string;
  event_id: string | null;
  event_type: string;
  payload: string;
  signature: string;
  status: 'delivered' | 'failed';
  http_status: number | null;
  attempts: number;
  next_retry_at: string | null;
  last_error: string | null;
  created_at: string;
  delivered_at: string | null;
}

/** Signe un payload : X-CauriPay-Signature: t=<unix>,v1=<hmac-sha256(secret, t.body)> */
export function signPayload(secret: string, rawBody: string): string {
  const t = Math.floor(Date.now() / 1000);
  const v1 = createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex');
  return `t=${t},v1=${v1}`;
}

export function merchantWebhookSecret(merchantId: string, mode: 'test' | 'live'): string {
  const m = qget<{ s: string }>(`SELECT ${mode === 'test' ? 'wsec_test' : 'wsec_live'} AS s FROM merchants WHERE id = ?`, merchantId);
  return m?.s ?? '';
}

const BACKOFF_MS = [1000, 5000, 30000, 300000]; // 4 tentatives de repli

/**
 * Dispatch un événement vers tous les webhooks actifs du marchand (mode + types).
 * La première tentative est awaitée ; les replis sont planifiés via setTimeout.
 */
export async function dispatchEvent(merchantId: string, mode: 'test' | 'live', eventType: string, data: Record<string, unknown>): Promise<void> {
  const webhooks = qall<WebhookRow>('SELECT * FROM webhooks WHERE merchant_id = ? AND mode = ? AND active = 1', merchantId, mode);

  const secret = merchantWebhookSecret(merchantId, mode);
  for (const wh of webhooks) {
    const types = parseJson<string[]>(wh.events, ['*']);
    if (!types.includes('*') && !types.includes(eventType)) continue;

    const payload = JSON.stringify({ event: eventType, data, created_at: toIso() });
    const signature = signPayload(secret, payload);

    const attemptId = newId('wh');
    qrun(
      `INSERT INTO webhook_attempts (id, webhook_id, event_id, event_type, payload, signature, status, attempts, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'failed', 0, ?)`,
    attemptId, wh.id, null, eventType, payload, signature, toIso());

    await deliverWithRetry(wh.id, attemptId, eventType, payload, signature, 1);
  }
}

async function deliverWithRetry(webhookId: string, attemptId: string, eventType: string, payload: string, signature: string, attempt: number): Promise<void> {
  const wh = qget<WebhookRow>('SELECT * FROM webhooks WHERE id = ?', webhookId);
  if (!wh) return;

  let httpStatus: number | null = null;
  let error: string | null = null;
  let delivered = false;

  // Anti-SSRF à la livraison (défense en profondeur, re-vérifie même si l'URL a changé en base).
  const urlCheck = await isSafeWebhookUrl(wh.url, { blockPrivate: config.blockPrivateWebhookUrls, requireHttps: config.requireHttpsWebhooks });
  if (!urlCheck.ok) {
    error = `URL bloquée (anti-SSRF) : ${urlCheck.reason}`;
  } else try {
    const res = await fetch(wh.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CauriPay-Signature': signature,
        'User-Agent': 'CauriPay-Webhooks/0.1 (sandbox)',
      },
      body: payload,
      signal: AbortSignal.timeout(8000),
    });
    httpStatus = res.status;
    delivered = res.ok;
    if (!res.ok) error = `HTTP ${res.status} ${res.statusText}`;
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  if (delivered) {
    db.prepare(`UPDATE webhook_attempts SET status = 'delivered', http_status = ?, attempts = ?, delivered_at = ?, last_error = NULL WHERE id = ?`)
      .run(httpStatus, attempt, toIso(), attemptId);
    return;
  }

  if (attempt >= BACKOFF_MS.length) {
    db.prepare(`UPDATE webhook_attempts SET status = 'failed', http_status = ?, attempts = ?, last_error = ? WHERE id = ?`)
      .run(httpStatus, attempt, error, attemptId);
    return;
  }

  const nextAt = new Date(Date.now() + BACKOFF_MS[attempt - 1]).toISOString();
  db.prepare(`UPDATE webhook_attempts SET http_status = ?, attempts = ?, next_retry_at = ?, last_error = ? WHERE id = ?`)
    .run(httpStatus, attempt, nextAt, error, attemptId);

  setTimeout(() => void deliverWithRetry(webhookId, attemptId, eventType, payload, signature, attempt + 1), BACKOFF_MS[attempt - 1]);
}

/** Rejeu : re-crée une tentative avec le dernier payload du webhook et livre une fois. */
export async function replayLastEvent(webhookId: string): Promise<string> {
  const last = qget<AttemptRow>('SELECT * FROM webhook_attempts WHERE webhook_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1', webhookId);
  if (!last) throw new Error('Aucune tentative enregistrée pour ce webhook.');

  const wh = qget<WebhookRow>('SELECT * FROM webhooks WHERE id = ?', webhookId);
  if (!wh) throw new Error('Webhook introuvable.');

  const secret = merchantWebhookSecret(wh.merchant_id, wh.mode);
  const signature = signPayload(secret, last.payload);

  const attemptId = newId('wh');
  qrun(
    `INSERT INTO webhook_attempts (id, webhook_id, event_id, event_type, payload, signature, status, attempts, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'failed', 0, ?)`,
  attemptId, wh.id, last.event_id, last.event_type, last.payload, signature, toIso());

  await deliverWithRetry(wh.id, attemptId, last.event_type, last.payload, signature, 1);
  return attemptId;
}

/** Ping de test : webhook.test livré une fois. */
export async function sendTestPing(webhookId: string): Promise<string> {
  const wh = qget<WebhookRow>('SELECT * FROM webhooks WHERE id = ?', webhookId);
  if (!wh) throw new Error('Webhook introuvable.');

  const secret = merchantWebhookSecret(wh.merchant_id, wh.mode);
  const payload = JSON.stringify({ event: 'webhook.test', data: { ping: true, timestamp: toIso() }, created_at: toIso() });
  const signature = signPayload(secret, payload);

  const attemptId = newId('wh');
  qrun(
    `INSERT INTO webhook_attempts (id, webhook_id, event_id, event_type, payload, signature, status, attempts, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'failed', 0, ?)`,
  attemptId, wh.id, null, 'webhook.test', payload, signature, toIso());

  await deliverWithRetry(wh.id, attemptId, 'webhook.test', payload, signature, 1);
  return attemptId;
}
