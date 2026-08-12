import type { FastifyInstance } from 'fastify';
import { db, qall, qget, qrun } from '../db.js';
import { newId } from '../ids.js';
import {
  generateApiKey,
  generateWebhookSecret,
  hashPassword,
  requireMerchant,
  signJwt,
  verifyPassword,
} from '../auth.js';
import { ApiError } from '../payments.js';
import { toIso } from '../util.js';

interface MerchantRow {
  id: string;
  name: string;
  company: string;
  email: string;
  password_hash: string;
  pk_test: string;
  sk_test_hash: string;
  pk_live: string;
  sk_live_hash: string;
  wsec_test: string;
  wsec_live: string;
  live_enabled: number;
  created_at: string;
  updated_at: string;
}

export function merchantJson(m: MerchantRow): Record<string, unknown> {
  return { id: m.id, name: m.name, company: m.company, email: m.email, created_at: m.created_at };
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/auth/register', async (req, reply) => {
    const body = (req.body ?? {}) as { name?: string; company?: string; email?: string; password?: string };
    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? '';

    if (!name || !email || !password) throw new ApiError(400, 'invalid_request_error', 'name, email et password sont requis.');
    if (!EMAIL_RE.test(email)) throw new ApiError(400, 'invalid_request_error', 'Email invalide.');
    if (password.length < 8) throw new ApiError(400, 'invalid_request_error', 'Mot de passe : 8 caractères minimum.');

    const exists = qget('SELECT id FROM merchants WHERE email = ?', email);;
    if (exists) throw new ApiError(409, 'email_taken', 'Un compte existe déjà avec cet email.');

    const id = newId('mer');
    const now = toIso();
    const pk_test = generateApiKey('pk', 'test');
    const sk_test = generateApiKey('sk', 'test');
    const pk_live = generateApiKey('pk', 'live');
    const sk_live = generateApiKey('sk', 'live');
    const wsec_test = generateWebhookSecret('test');
    const wsec_live = generateWebhookSecret('live');

    qrun(
      `INSERT INTO merchants (id, name, company, email, password_hash, pk_test, sk_test, pk_live, sk_live, wsec_test, wsec_live, live_enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    id, name, body.company?.trim() || '', email, hashPassword(password), pk_test, sk_test, pk_live, sk_live, wsec_test, wsec_live, now, now);

    const merchant = qget<MerchantRow>('SELECT * FROM merchants WHERE id = ?', id)!;
    reply.code(201);
    return { token: signJwt(id), merchant: merchantJson(merchant) };
  });

  app.post('/api/auth/login', async (req) => {
    const body = (req.body ?? {}) as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase();
    if (!email || !body.password) throw new ApiError(400, 'invalid_request_error', 'email et password sont requis.');

    const merchant = qget<MerchantRow>('SELECT * FROM merchants WHERE email = ?', email);
    if (!merchant || !verifyPassword(body.password, merchant.password_hash)) {
      throw new ApiError(401, 'unauthorized', 'Email ou mot de passe incorrect.');
    }
    return { token: signJwt(merchant.id), merchant: merchantJson(merchant) };
  });

  app.get('/api/auth/me', { preHandler: requireMerchant }, async (req) => {
    const merchant = qget<MerchantRow>('SELECT * FROM merchants WHERE id = ?', req.merchantId)!;
    return { merchant: merchantJson(merchant) };
  });

  app.patch('/api/auth/me', { preHandler: requireMerchant }, async (req) => {
    const body = (req.body ?? {}) as { name?: string; company?: string; password?: string; password_current?: string };
    const merchant = qget<MerchantRow>('SELECT * FROM merchants WHERE id = ?', req.merchantId)!;

    const name = body.name?.trim() || merchant.name;
    const company = typeof body.company === 'string' ? body.company.trim() : merchant.company;

    if (body.password) {
      if (!body.password_current || !verifyPassword(body.password_current, merchant.password_hash)) {
        throw new ApiError(400, 'invalid_request_error', 'password_current est requis et doit être correct.');
      }
      if (body.password.length < 8) throw new ApiError(400, 'invalid_request_error', 'Mot de passe : 8 caractères minimum.');
      qrun('UPDATE merchants SET password_hash = ?, updated_at = ? WHERE id = ?', hashPassword(body.password), toIso(), merchant.id);;
    }

    qrun('UPDATE merchants SET name = ?, company = ?, updated_at = ? WHERE id = ?', name, company, toIso(), merchant.id);;
    const fresh = qget<MerchantRow>('SELECT * FROM merchants WHERE id = ?', merchant.id)!;
    return { merchant: merchantJson(fresh) };
  });
}
