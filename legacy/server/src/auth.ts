import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { config } from './config.js';
import { db, qall, qget, qrun } from './db.js';

// ---------- Mots de passe (scrypt natif) ----------

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  return timingSafeEqual(candidate, Buffer.from(hash, 'hex'));
}

// ---------- JWT (session dashboard) ----------

export function signJwt(merchantId: string): string {
  return jwt.sign({ merchant_id: merchantId }, config.jwtSecret, { expiresIn: '7d' });
}

export function verifyJwt(token: string): string | null {
  try {
    const payload = jwt.verify(token, config.jwtSecret) as { merchant_id?: string };
    return payload.merchant_id ?? null;
  } catch {
    return null;
  }
}

/** Pré-handler Fastify : exige un JWT marchand valide. */
export async function requireMerchant(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return reply.code(401).send({ error: { type: 'authentication_error', code: 'unauthorized', message: 'Jeton manquant' } });
  }
  const merchantId = verifyJwt(header.slice(7));
  if (!merchantId) {
    return reply.code(401).send({ error: { type: 'authentication_error', code: 'unauthorized', message: 'Jeton invalide ou expiré' } });
  }
  req.merchantId = merchantId;
}

// ---------- Clés API ----------

export const sha256hex = (s: string): string => createHash('sha256').update(s).digest('hex');

export function generateApiKey(prefix: 'pk' | 'sk', mode: 'test' | 'live'): string {
  return `${prefix}_${mode}_${randomBytes(18).toString('base64url').replace(/-/g, 'A').replace(/_/g, 'B')}`;
}

export function generateWebhookSecret(mode: 'test' | 'live'): string {
  return `whsec_${mode}_${randomBytes(18).toString('base64url').replace(/-/g, 'A').replace(/_/g, 'B')}`;
}

export interface ApiKeyContext {
  merchantId: string;
  mode: 'test' | 'live';
  scope: 'publishable' | 'secret';
}

/**
 * Résout une clé API (pk_/sk_) vers un contexte marchand.
 * Les sk_ sont stockées hachées (sha256) : la comparaison se fait sur le hash.
 */
export function resolveApiKey(header: string | undefined): ApiKeyContext | null {
  if (!header?.startsWith('Bearer ')) return null;
  const key = header.slice(7).trim();
  const m = key.match(/^(pk|sk)_(test|live)_/);
  if (!m) return null;
  const scope = m[1];
  const mode = m[2] as 'test' | 'live';
  const col = scope === 'sk' ? (mode === 'test' ? 'sk_test' : 'sk_live') : mode === 'test' ? 'pk_test' : 'pk_live';
  const row = qget<{ id: string }>(`SELECT id FROM merchants WHERE ${col} = ?`, key);
  if (!row) return null;
  return { merchantId: row.id, mode, scope: scope === 'sk' ? 'secret' : 'publishable' };
}

/** Pré-handler Fastify pour l'API développeur /api/v1. */
export async function requireApiKey(req: FastifyRequest, reply: FastifyReply): Promise<ApiKeyContext | null> {
  const ctx = resolveApiKey(req.headers.authorization);
  if (!ctx) {
    reply.code(401).send({ error: { type: 'authentication_error', code: 'unauthorized', message: 'Clé API invalide' } });
    return null;
  }
  if (ctx.mode === 'live') {
    const merchant = qget<{ live_enabled: number }>('SELECT live_enabled FROM merchants WHERE id = ?', ctx.merchantId);
    if (!merchant?.live_enabled) {
      reply.code(403).send({ error: { type: 'permission_error', code: 'live_not_enabled', message: 'Le mode live n\'est pas activé pour ce compte' } });
      return null;
    }
  }
  req.apiKey = ctx;
  return ctx;
}
