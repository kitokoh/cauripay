import { IsBase64, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { KycDocumentType, KycLevel, KycStatus } from '@prisma/client';

export class SubmitKycDto {
  @IsEnum(KycLevel)
  level!: KycLevel;

  @IsEnum(KycDocumentType)
  documentType!: KycDocumentType;

  /** Document en base64 (≤ 5 Mo après décodage — vérifié dans le service). */
  @IsBase64()
  @IsNotEmpty()
  documentBase64!: string;

  /** Selfie en base64 (≤ 5 Mo). */
  @IsBase64()
  @IsNotEmpty()
  selfieBase64!: string;
}

export class RejectKycDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}

export class KycQueueQuery {
  @IsOptional()
  @IsEnum(KycStatus)
  status?: KycStatus;

  @IsOptional()
  @IsEnum(KycLevel)
  level?: KycLevel;

  @IsOptional()
  @IsEnum(KycDocumentType)
  documentType?: KycDocumentType;

  @IsOptional()
  @IsString()
  page?: string;
}
