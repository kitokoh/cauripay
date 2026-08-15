import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { config } from './config.js';
import { qget } from './db.js';
import { apiKeyHash } from './secrets.js';

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

export interface ApiKeyContext {
  merchantId: string;
  mode: 'test' | 'live';
  scope: 'publishable' | 'secret';
}

/**
 * Résout une clé API (pk_/sk_) vers un contexte marchand.
 * Les sk_ sont stockées hachées (sha256) : la comparaison se fait sur le hash.
 * Les pk_ sont publiques par nature (affichage dashboard) : stockées en clair.
 */
export function resolveApiKey(header: string | undefined): ApiKeyContext | null {
  if (!header?.startsWith('Bearer ')) return null;
  const key = header.slice(7).trim();
  const m = key.match(/^(pk|sk)_(test|live)_/);
  if (!m) return null;
  const scope = m[1];
  const mode = m[2] as 'test' | 'live';
  let row: { id: string } | undefined;
  if (scope === 'sk') {
    const col = mode === 'test' ? 'sk_test_hash' : 'sk_live_hash';
    row = qget<{ id: string }>(`SELECT id FROM merchants WHERE ${col} = ?`, apiKeyHash(key));
  } else {
    const col = mode === 'test' ? 'pk_test' : 'pk_live';
    row = qget<{ id: string }>(`SELECT id FROM merchants WHERE ${col} = ?`, key);
  }
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
