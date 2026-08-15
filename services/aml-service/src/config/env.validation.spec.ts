import { describe, expect, it } from '@jest/globals';
import { validateEnv } from './env.validation';

describe('validateEnv (aml-service — fail-fast)', () => {
  it('refuse si AML_DATABASE_URL manque', () => {
    expect(() =>
      validateEnv({ RABBITMQ_URL: 'amqp://x', INTERNAL_SERVICE_KEY: 'k' } as NodeJS.ProcessEnv),
    ).toThrow(/AML_DATABASE_URL/);
  });

  it('refuse une clé de dev en production', () => {
    expect(() =>
      validateEnv({
        AML_DATABASE_URL: 'postgresql://x',
        RABBITMQ_URL: 'amqp://x',
        INTERNAL_SERVICE_KEY: 'dev_internal_service_key_change_me',
        NODE_ENV: 'production',
      } as NodeJS.ProcessEnv),
    ).toThrow(/INTERNAL_SERVICE_KEY/);
  });

  it('parse un environnement valide (port 3040 par défaut)', () => {
    const env = validateEnv({
      AML_DATABASE_URL: 'postgresql://goursi:pass@postgres:5432/goursi_aml',
      RABBITMQ_URL: 'amqp://goursi:pass@rabbitmq:5672',
      INTERNAL_SERVICE_KEY: 'dev_internal_service_key_change_me',
      JWT_SECRET: 'secret-test',
    } as NodeJS.ProcessEnv);
    expect(env.PORT).toBe(3040);
    expect(env.JWT_SECRET).toBe('secret-test');
  });
});
