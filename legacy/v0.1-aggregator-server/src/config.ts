import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  port: Number(process.env.PORT || 4000),
  host: process.env.HOST || '0.0.0.0',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me-in-prod',
  dbPath: process.env.DATABASE_PATH || path.join(here, '..', '..', 'data', 'cauripay.db'),
  dashboardDist: process.env.DASHBOARD_DIST || path.join(here, '..', '..', 'dashboard', 'dist'),
  publicBaseUrl: process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 4000}`,
};
