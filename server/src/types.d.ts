import type { ApiKeyContext } from './auth.js';

declare module 'fastify' {
  interface FastifyRequest {
    merchantId?: string;
    apiKey?: ApiKeyContext;
  }
}
