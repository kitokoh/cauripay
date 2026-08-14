import 'reflect-metadata';
import { validate } from './env.validation';

describe('env.validation (GOURSI-020a)', () => {
  it('accepte une configuration complète', () => {
    const cfg = {
      DATABASE_URL: 'postgresql://goursi:pass@localhost:5432/goursi_api_core',
      INTERNAL_SERVICE_KEY: 'dev-key',
      JWT_ISSUER: 'http://keycloak:8080/realms/goursi',
      JWKS_URL: 'http://keycloak:8080/realms/goursi/protocol/openid-connect/certs',
      REDIS_URL: 'redis://localhost:6379',
      RABBITMQ_URL: 'amqp://localhost:5672',
      API_CORE_PORT: '3000',
    };
    expect(() => validate(cfg)).not.toThrow();
  });

  it('échoue vite et clairement si une variable requise manque (fail-fast)', () => {
    const cfg = {
      DATABASE_URL: 'postgresql://goursi:pass@localhost:5432/goursi_api_core',
      INTERNAL_SERVICE_KEY: 'dev-key',
      // JWT_ISSUER manquant
      JWKS_URL: 'http://keycloak:8080/realms/goursi/protocol/openid-connect/certs',
      REDIS_URL: 'redis://localhost:6379',
      RABBITMQ_URL: 'amqp://localhost:5672',
      API_CORE_PORT: '3000',
    };
    expect(() => validate(cfg)).toThrow(/JWT_ISSUER/);
  });

  it('refuse un port invalide', () => {
    const cfg = {
      DATABASE_URL: 'postgresql://goursi:pass@localhost:5432/goursi_api_core',
      INTERNAL_SERVICE_KEY: 'dev-key',
      JWT_ISSUER: 'http://keycloak:8080/realms/goursi',
      JWKS_URL: 'http://keycloak:8080/realms/goursi/protocol/openid-connect/certs',
      REDIS_URL: 'redis://localhost:6379',
      RABBITMQ_URL: 'amqp://localhost:5672',
      API_CORE_PORT: 'not-a-port',
    };
    expect(() => validate(cfg)).toThrow(/API_CORE_PORT/);
  });
});
