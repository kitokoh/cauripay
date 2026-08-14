import { plainToInstance } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Min, validateSync } from 'class-validator';

/**
 * Validation de la configuration au démarrage (GOURSI-001b / GOURSI-020a).
 * Règle : refuser de démarrer si une variable requise manque ou est invalide (fail-fast).
 */
class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  INTERNAL_SERVICE_KEY!: string;

  @IsString()
  @IsNotEmpty()
  JWT_ISSUER!: string;

  @IsString()
  @IsNotEmpty()
  JWKS_URL!: string;

  @IsString()
  @IsNotEmpty()
  REDIS_URL!: string;

  @IsString()
  @IsNotEmpty()
  RABBITMQ_URL!: string;

  @IsInt()
  @Min(1)
  API_CORE_PORT!: number;
}

/** Fonction de validation branchée sur ConfigModule.forRoot({ validate }). */
export function validate(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const missing = errors.map((e) => e.property);
    throw new Error(
      `Configuration api-core invalide — variables manquantes ou mal formées : ${missing.join(', ')}. ` +
        `Copier .env.example vers .env (voir docs/ONBOARDING.md).`,
    );
  }
  return validated;
}
