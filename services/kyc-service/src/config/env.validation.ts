import * as Joi from 'joi';
import { registerAs } from '@nestjs/config';

/**
 * Validation stricte de l'environnement (GOURSI-001b) : le service REFUSE de
 * démarrer si une variable requise manque ou est invalide. La clé de
 * chiffrement AES-256 (32 octets hex) est OBLIGATOIRE — jamais de défaut.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  KYC_PORT: Joi.number().port().default(3030),
  KYC_DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).optional(),
  DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).optional(),
  RABBITMQ_URL: Joi.string().required(),
  INTERNAL_SERVICE_KEY: Joi.string().min(16).required(),
  KYC_ENCRYPTION_KEY: Joi.string()
    .min(32)
    .message('KYC_ENCRYPTION_KEY : 32 caractères minimum (64 hex recommandé : openssl rand -hex 32)')
    .required(),
  JWT_ISSUER: Joi.string().uri().optional(), // requis en production (Keycloak RS256)
  JWKS_URL: Joi.string().uri().optional(),
  JWT_SECRET: Joi.string().min(16).optional(),
  KYC_MAX_DOCUMENT_BYTES: Joi.number().default(5 * 1024 * 1024),
}).custom((value: Record<string, unknown>, helpers) => {
  // Convention plateforme : KYC_DATABASE_URL (avec DATABASE_URL en repli) — l'un des deux est requis.
  if (!value.KYC_DATABASE_URL && !value.DATABASE_URL) {
    return helpers.error('any.required', { message: 'KYC_DATABASE_URL (ou DATABASE_URL) est requis' });
  }
  return value;
});

export default registerAs('env', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.KYC_PORT ?? process.env.KYC_SERVICE_PORT ?? 3030),
  databaseUrl: process.env.KYC_DATABASE_URL ?? process.env.DATABASE_URL,
  rabbitmqUrl: process.env.RABBITMQ_URL,
  internalServiceKey: process.env.INTERNAL_SERVICE_KEY,
  encryptionKey: process.env.KYC_ENCRYPTION_KEY ?? '',
  jwtIssuer: process.env.JWT_ISSUER,
  jwksUrl: process.env.JWKS_URL,
  jwtSecret: process.env.JWT_SECRET,
  maxDocumentBytes: Number(process.env.KYC_MAX_DOCUMENT_BYTES ?? 5 * 1024 * 1024),
}));
