import * as Joi from 'joi';
import { registerAs } from '@nestjs/config';

/**
 * Validation stricte de l'environnement (GOURSI-001b) :
 * le service REFUSE de démarrer si une variable requise manque ou est invalide.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  DEV_GATEWAY_PORT: Joi.number().port().default(3080),
  DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).required(),
  REDIS_URL: Joi.string().required(),
  RABBITMQ_URL: Joi.string().required(),
  INTERNAL_SERVICE_KEY: Joi.string().min(16).required(),
  JWT_ISSUER: Joi.string().uri().required(),
  JWKS_URL: Joi.string().uri().required(),
  JWT_SECRET: Joi.string().min(16).optional(),
  WEBHOOK_SIGNING_SECRET: Joi.string().min(16).optional(),
  CORS_ORIGINS: Joi.string().optional(),
});

export default registerAs('env', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.DEV_GATEWAY_PORT ?? 3080),
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  rabbitmqUrl: process.env.RABBITMQ_URL,
  internalServiceKey: process.env.INTERNAL_SERVICE_KEY,
  jwtIssuer: process.env.JWT_ISSUER,
  jwksUrl: process.env.JWKS_URL,
  jwtSecret: process.env.JWT_SECRET,
  webhookSigningSecret: process.env.WEBHOOK_SIGNING_SECRET,
}));
