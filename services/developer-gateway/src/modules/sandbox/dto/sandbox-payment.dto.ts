import { IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class SandboxPaymentDto {
  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
