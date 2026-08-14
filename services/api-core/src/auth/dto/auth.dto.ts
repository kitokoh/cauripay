import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Length, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: '+23566000001' })
  @Matches(/^\+235\d{8}$/, { message: 'Téléphone invalide (+235XXXXXXXX)' })
  phone!: string;

  @ApiProperty({ example: 'Achille N' })
  @IsString()
  @MinLength(2)
  fullName!: string;

  @ApiProperty({ example: 'motdepasse123' })
  @IsString()
  @MinLength(8)
  password!: string;
}

export class LoginDto {
  @ApiProperty({ example: '+23566000001' })
  @Matches(/^\+235\d{8}$/)
  phone!: string;

  @ApiProperty()
  @IsString()
  password!: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '+23566000001' })
  @Matches(/^\+235\d{8}$/)
  phone!: string;

  @ApiProperty({ example: '123456' })
  @Length(6, 6)
  code!: string;

  @ApiProperty({ required: false, enum: ['LOGIN', 'CASH_IN', 'CASH_OUT'] })
  @IsOptional()
  @IsIn(['LOGIN', 'CASH_IN', 'CASH_OUT'])
  purpose?: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  refreshToken!: string;
}

export class ChangeMpinDto {
  @ApiProperty({ example: '000000' })
  @IsOptional()
  @Matches(/^\d{6}$/)
  oldMpin?: string;

  @ApiProperty({ example: '123456' })
  @Matches(/^\d{6}$/, { message: 'MPIN : 6 chiffres' })
  newMpin!: string;
}
