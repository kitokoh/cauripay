import { IsBase64, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentType, KycLevel } from '../../../node_modules/.prisma/kyc-client';

const MAX_DOCUMENT_B64 = 3_000_000; // ~2,2 Mo décodés

/**
 * POST /kyc/submit (GOURSI-024a).
 * Les documents arrivent en base64 (UTF-8) ; ils sont chiffrés AES-256-GCM au repos.
 */
export class SubmitKycDto {
  @ApiProperty({ enum: KycLevel, example: 'VERIFIED' })
  @IsEnum(KycLevel)
  level!: KycLevel;

  @ApiProperty({ enum: DocumentType, example: 'NATIONAL_ID' })
  @IsEnum(DocumentType)
  documentType!: DocumentType;

  @ApiProperty({ description: 'Document (base64)', maxLength: MAX_DOCUMENT_B64 })
  @IsString()
  @IsBase64()
  @MinLength(16)
  @MaxLength(MAX_DOCUMENT_B64)
  documentBase64!: string;

  @ApiPropertyOptional({ description: 'Selfie (base64)' })
  @IsOptional()
  @IsString()
  @IsBase64()
  @MaxLength(MAX_DOCUMENT_B64)
  selfieBase64?: string;

  @ApiPropertyOptional({ description: 'Pays (ISO 3166-1 alpha-2)', example: 'TD' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;
}
