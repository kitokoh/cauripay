import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class SandboxEventDto {
  @IsString()
  @IsNotEmpty()
  type!: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
