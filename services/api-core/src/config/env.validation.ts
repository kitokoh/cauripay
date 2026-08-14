import * as Joi from 'joi';
import { registerAs } from '@nestjs/config';

/**
 * Validation stricte de l'environnement (GOURSI-001b) :
 * le service REFUSE de démarrer si une variable requise manque ou est invalide.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  API_CORE_PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).required(),
  REDIS_URL: Joi.string().required(),
  RABBITMQ_URL: Joi.string().required(),
  INTERNAL_SERVICE_KEY: Joi.string().min(16).required(),
  LEDGER_BASE_URL: Joi.string().uri().default('http://ledger-service:3010'),
  LEDGER_TIMEOUT_MS: Joi.number().default(10000),
  JWT_ISSUER: Joi.string().uri().required(),
  JWKS_URL: Joi.string().uri().required(),
  JWT_SECRET: Joi.string().min(16).required(),
  WEBHOOK_SIGNING_SECRET: Joi.string().min(16).optional(),
  CORS_ORIGINS: Joi.string().optional(),
});

export default registerAs('env', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.API_CORE_PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  rabbitmqUrl: process.env.RABBITMQ_URL,
  internalServiceKey: process.env.INTERNAL_SERVICE_KEY,
  ledgerBaseUrl: process.env.LEDGER_BASE_URL ?? 'http://ledger-service:3010',
  ledgerTimeoutMs: Number(process.env.LEDGER_TIMEOUT_MS ?? 10000),
  jwtIssuer: process.env.JWT_ISSUER,
  jwksUrl: process.env.JWKS_URL,
  jwtSecret: process.env.JWT_SECRET,
  webhookSigningSecret: process.env.WEBHOOK_SIGNING_SECRET,
}));
