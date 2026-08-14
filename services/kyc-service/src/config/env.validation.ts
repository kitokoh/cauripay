import * as Joi from 'joi';
import { registerAs } from '@nestjs/config';

/**
 * Validation stricte de l'environnement (GOURSI-001b) :
 * le service REFUSE de démarrer si une variable requise manque ou est invalide.
 * KYC_ENCRYPTION_KEY ≥ 32 octets — la clé AES-256 ne doit JAMAIS être commitée.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  KYC_PORT: Joi.number().port().default(3030),
  DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).required(),
  RABBITMQ_URL: Joi.string().required(),
  KYC_ENCRYPTION_KEY: Joi.string().min(32).required(),
  INTERNAL_SERVICE_KEY: Joi.string().min(16).required(),
  JWT_ISSUER: Joi.string().uri().required(),
  JWKS_URL: Joi.string().uri().required(),
});

export default registerAs('env', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.KYC_PORT ?? 3030),
  databaseUrl: process.env.DATABASE_URL,
  rabbitmqUrl: process.env.RABBITMQ_URL,
  kycEncryptionKey: process.env.KYC_ENCRYPTION_KEY,
  internalServiceKey: process.env.INTERNAL_SERVICE_KEY,
  jwtIssuer: process.env.JWT_ISSUER,
  jwksUrl: process.env.JWKS_URL,
}));
