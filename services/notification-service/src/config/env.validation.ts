import * as Joi from 'joi';
import { registerAs } from '@nestjs/config';

/**
 * Validation stricte de l'environnement (GOURSI-026a) :
 * le service REFUSE de démarrer si une variable requise manque ou est invalide.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  NOTIFICATION_PORT: Joi.number().port().default(3050),
  DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).required(),
  REDIS_URL: Joi.string().required(),
  RABBITMQ_URL: Joi.string().required(),
  INTERNAL_SERVICE_KEY: Joi.string().min(16).required(),
  // Canaux — optionnels (dev) ; fournis en staging/prod
  SMS_PROVIDER_URL: Joi.string().uri().optional().allow(''),
  SMS_API_KEY: Joi.string().optional().allow(''),
  FCM_SERVER_KEY: Joi.string().optional().allow(''),
  // JWT Keycloak (routes internes acceptent aussi un Bearer JWT)
  JWT_ISSUER: Joi.string().uri().optional().default('http://keycloak:8080/realms/goursi'),
  JWKS_URL: Joi.string().uri().optional().default('http://keycloak:8080/realms/goursi/protocol/openid-connect/certs'),
});

export default registerAs('env', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.NOTIFICATION_PORT ?? 3050),
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  rabbitmqUrl: process.env.RABBITMQ_URL,
  internalServiceKey: process.env.INTERNAL_SERVICE_KEY,
  smsProviderUrl: process.env.SMS_PROVIDER_URL ?? undefined,
  smsApiKey: process.env.SMS_API_KEY ?? undefined,
  fcmServerKey: process.env.FCM_SERVER_KEY ?? undefined,
  jwtIssuer: process.env.JWT_ISSUER ?? 'http://keycloak:8080/realms/goursi',
  jwksUrl: process.env.JWKS_URL ?? 'http://keycloak:8080/realms/goursi/protocol/openid-connect/certs',
}));
