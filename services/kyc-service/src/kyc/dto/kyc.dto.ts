import { IsBase64, IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { KycLevel } from '../../../generated/kyc';

export const KYC_DOCUMENT_TYPES = ['PASSPORT', 'NATIONAL_ID', 'DRIVER_LICENSE', 'VOTER_CARD'] as const;

export class SubmitKycDto {
  @IsEnum(KycLevel)
  level!: KycLevel;

  @IsIn(KYC_DOCUMENT_TYPES)
  documentType!: string;

  @IsString()
  @IsBase64()
  documentBase64!: string;

  @IsOptional()
  @IsString()
  @IsBase64()
  selfieBase64?: string;
}

export class RejectKycDto {
  @IsString()
  @MaxLength(500)
  reason!: string;
}

export class KycQueueQuery {
  @IsOptional()
  @IsEnum(KycLevel)
  level?: KycLevel;

  @IsOptional()
  @IsString()
  documentType?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  page?: string;
}
