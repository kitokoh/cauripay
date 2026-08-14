import { plainToInstance } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Min, validateSync } from 'class-validator';

/** Validation fail-fast (GOURSI-001b) — noms conformes .env.example. */
class EnvironmentVariables {
  @IsString() @IsNotEmpty() AML_DATABASE_URL!: string;
  @IsString() @IsNotEmpty() INTERNAL_SERVICE_KEY!: string;
  @IsString() @IsNotEmpty() JWT_ISSUER!: string;
  @IsString() @IsNotEmpty() JWKS_URL!: string;
  @IsString() @IsNotEmpty() RABBITMQ_URL!: string;
  @IsInt() @Min(1) AML_PORT!: number;
}

export function validate(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, { enableImplicitConversion: true });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    const missing = errors.map((e) => e.property);
    throw new Error(
      `Configuration aml-service invalide — variables manquantes ou mal formées : ${missing.join(', ')}. ` +
        `Copier .env.example vers .env (voir docs/ONBOARDING.md).`,
    );
  }
  return validated;
}
