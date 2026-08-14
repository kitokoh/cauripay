import * as Joi from 'joi';
import { registerAs } from '@nestjs/config';

/**
 * Validation stricte de l'environnement (GOURSI-027a) :
 * le service REFUSE de démarrer si une variable requise manque ou est invalide.
 * Pas de base de données : les sessions USSD vivent dans Redis (TTL 180 s).
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  USSD_PORT: Joi.number().port().default(3060),
  REDIS_URL: Joi.string().required(),
  INTERNAL_SERVICE_KEY: Joi.string().min(16).required(),
  API_CORE_BASE_URL: Joi.string().uri().default('http://api-core:3000'),
  RABBITMQ_URL: Joi.string().optional(),
  JWT_ISSUER: Joi.string().uri().required(),
  JWKS_URL: Joi.string().uri().required(),
});

export default registerAs('env', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.USSD_PORT ?? 3060),
  redisUrl: process.env.REDIS_URL,
  internalServiceKey: process.env.INTERNAL_SERVICE_KEY,
  apiCoreBaseUrl: process.env.API_CORE_BASE_URL ?? 'http://api-core:3000',
  rabbitmqUrl: process.env.RABBITMQ_URL,
  jwtIssuer: process.env.JWT_ISSUER,
  jwksUrl: process.env.JWKS_URL,
}));
