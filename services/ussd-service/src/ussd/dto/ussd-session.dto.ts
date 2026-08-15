import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

/**
 * Requête passerelle opérateur USSD (GOURSI-027c).
 * Endpoint PUBLIC : appelé par la passerelle USSD, pas de JWT (validation
 * opérateur = future étape, voir JWT_ISSUER/JWKS_URL).
 */
export class UssdSessionDto {
  @ApiProperty({ example: 'sess-8f3a1c', description: 'Identifiant de session USSD (constant pendant la session)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  sessionId!: string;

  @ApiProperty({ example: '+23566000001', description: 'Numéro MSISDN de l\'appelant' })
  @IsString()
  @Matches(/^\+?\d{8,15}$/, { message: 'msisdn : numéro invalide' })
  msisdn!: string;

  @ApiProperty({ example: 'fr', description: 'Saisie DTMF utilisateur (ou \'\' au premier appel)' })
  @IsString()
  @MaxLength(64)
  input!: string;
}
