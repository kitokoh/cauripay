import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import fs from 'node:fs';
import { config } from './config.js';
import { authRoutes } from './routes/auth.js';
import { merchantRoutes } from './routes/merchant.js';
import { webhookRoutes } from './routes/webhooks.js';
import { paymentsApiRoutes } from './routes/payments.js';
import { checkoutRoutes } from './routes/checkout.js';
import { ApiError } from './payments.js';

export async function buildApp() {
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL || 'info' } });

  // CORS : en dev, localhost ; en production, liste blanche explicite (CORS_ORIGINS).
  await app.register(cors, { origin: config.isProd ? config.corsOrigins : true });
  // Rate limit global (IP) : dashboard, checkout. /api/v1 est limité PAR CLÉ (voir routes/payments.ts).
  await app.register(rateLimit, { max: config.rateLimitGlobal, timeWindow: '1 minute' });

  // Base publique pour les checkout_url (dépend du host de la requête).
  app.addHook('onRequest', async (req) => {
    (globalThis as { __base?: string }).__base = `${req.protocol}://${req.host}`;
  });

  // Erreurs normalisées.
  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof ApiError) {
      return reply.code(err.status).send({ error: { type: 'invalid_request_error', code: err.code, message: err.message } });
    }
    app.log.error(err);
    return reply.code(500).send({ error: { type: 'api_error', code: 'internal_error', message: 'Erreur interne du serveur.' } });
  });

  await authRoutes(app);
  await merchantRoutes(app);
  await webhookRoutes(app);
  await paymentsApiRoutes(app);
  await checkoutRoutes(app);

  app.get('/health', async () => ({ ok: true, service: 'cauripay', version: '0.1.0' }));

  // SPA dashboard servie en production (si build présent).
  if (fs.existsSync(config.dashboardDist)) {
    const staticPlugin = (await import('@fastify/static')).default;
    await app.register(staticPlugin, { root: config.dashboardDist, prefix: '/' });
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith('/api') || req.url.startsWith('/checkout')) {
        return reply.code(404).send({ error: { type: 'invalid_request_error', code: 'not_found', message: 'Introuvable.' } });
      }
      return reply.type('text/html').send(fs.readFileSync(`${config.dashboardDist}/index.html`));
    });
  }

  return app;
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop() ?? '');
if (isMain) {
  const app = await buildApp();
  await app.listen({ port: config.port, host: config.host });
}
