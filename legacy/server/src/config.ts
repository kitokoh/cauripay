import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';

const DEFAULT_JWT_SECRET = 'dev-secret-change-me-in-prod';
const jwtSecret = process.env.JWT_SECRET || '';

/**
 * Fail-fast : en production, on refuse de démarrer avec un secret JWT absent
 * ou connu (forgery totale des sessions dashboard).
 */
if (isProd && (!jwtSecret || jwtSecret === DEFAULT_JWT_SECRET || jwtSecret.length < 32)) {
  throw new Error(
    'FATAL: JWT_SECRET doit être défini et aléatoire (>= 32 caractères) en production. ' +
      'Générez-en un avec : openssl rand -hex 32',
  );
}

function intFromEnv(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

// CORS : liste blanche explicite en production (défaut : aucun cross-origin).
const corsOriginsRaw = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export const config = {
  port: Number(process.env.PORT || 4000),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: NODE_ENV,
  isProd,
  jwtSecret: jwtSecret || DEFAULT_JWT_SECRET,
  dbPath: process.env.DATABASE_PATH || path.join(here, '..', '..', 'data', 'cauripay.db'),
  dashboardDist: process.env.DASHBOARD_DIST || path.join(here, '..', '..', 'dashboard', 'dist'),
  publicBaseUrl: process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 4000}`,

  /** Origines CORS autorisées. En dev : localhost ; en prod : CORS_ORIGINS obligatoire. */
  corsOrigins: isProd ? corsOriginsRaw : [...corsOriginsRaw, 'http://localhost:5173', 'http://localhost:4000'],

  /** Rate limit global (dashboard, checkout) — par IP. */
  rateLimitGlobal: intFromEnv('RATE_LIMIT_GLOBAL', 300),
  /** Rate limit /api/v1 — PAR CLÉ API. */
  rateLimitPerKey: intFromEnv('RATE_LIMIT_PER_KEY', 1000),

  /**
   * Webhooks sortants : interdire les IP privées/locales (SSRF) ?
   * Production : toujours vrai. Dev : vrai sauf si ALLOW_PRIVATE_WEBHOOKS=true.
   */
  blockPrivateWebhookUrls: isProd ? process.env.ALLOW_PRIVATE_WEBHOOKS !== 'true' : process.env.ALLOW_PRIVATE_WEBHOOKS !== 'true',
  /** Production : les webhooks sortants doivent être en https (sauf ALLOW_INSECURE_WEBHOOKS=true). */
  requireHttpsWebhooks: isProd ? process.env.ALLOW_INSECURE_WEBHOOKS !== 'true' : false,

  /** Nombre max de webhooks par marchand (par mode). */
  maxWebhooksPerMerchant: intFromEnv('MAX_WEBHOOKS_PER_MERCHANT', 10),

  /** Checkout : échecs de PIN max avant blocage, fenêtre de blocage. */
  checkoutMaxPinFailures: intFromEnv('CHECKOUT_MAX_PIN_FAILURES', 5),
  checkoutBlockMinutes: intFromEnv('CHECKOUT_BLOCK_MINUTES', 10),
};
