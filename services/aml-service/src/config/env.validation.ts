/**
 * Validation d'environnement (pattern commun) — FAIL-FAST.
 */

export interface Env {
  PORT: number;
  AML_DATABASE_URL: string;
  RABBITMQ_URL: string;
  INTERNAL_SERVICE_KEY: string;
  JWT_SECRET?: string;
  NODE_ENV: 'development' | 'test' | 'production';
}

const REQUIRED = ['AML_DATABASE_URL', 'RABBITMQ_URL', 'INTERNAL_SERVICE_KEY'] as const;

export function validateEnv(raw: NodeJS.ProcessEnv = process.env): Env {
  const missing = REQUIRED.filter((k) => !raw[k] || raw[k]!.trim() === '');
  const isProd = raw.NODE_ENV === 'production';

  if (missing.length > 0) {
    const hint = isProd
      ? 'Aucun fallback en production — configurer les secrets avant de démarrer.'
      : 'Valeurs de dev autorisées via .env (cf. .env.example racine).';
    throw new Error(
      `[aml-service] Configuration incomplète — variables manquantes : ${missing.join(', ')}. ${hint}`,
    );
  }

  const port = Number(raw.PORT ?? 3040);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`[aml-service] PORT invalide : "${raw.PORT}" (attendu : entier 1-65535).`);
  }

  if (isProd && raw.INTERNAL_SERVICE_KEY && /dev_|change_me|secret/.test(raw.INTERNAL_SERVICE_KEY)) {
    throw new Error(
      '[aml-service] INTERNAL_SERVICE_KEY ressemble à une valeur de dev — refus de démarrer en production.',
    );
  }

  return {
    PORT: port,
    AML_DATABASE_URL: raw.AML_DATABASE_URL!,
    RABBITMQ_URL: raw.RABBITMQ_URL!,
    INTERNAL_SERVICE_KEY: raw.INTERNAL_SERVICE_KEY!,
    JWT_SECRET: raw.JWT_SECRET,
    NODE_ENV: (raw.NODE_ENV as Env['NODE_ENV']) ?? 'development',
  };
}
