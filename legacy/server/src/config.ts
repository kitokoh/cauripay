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

export const config = {
  nodeEnv: NODE_ENV,
  isProd,
  port: Number(process.env.PORT || 4000),
  host: process.env.HOST || '0.0.0.0',
  jwtSecret: jwtSecret || DEFAULT_JWT_SECRET,
  dbPath: process.env.DATABASE_PATH || path.join(here, '..', '..', 'data', 'cauripay.db'),
  dashboardDist: process.env.DASHBOARD_DIST || path.join(here, '..', '..', 'dashboard', 'dist'),
  publicBaseUrl: process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 4000}`,
};
