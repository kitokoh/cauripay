import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class TransferDto {
  @ApiProperty({ example: 'cmd-001' })
  @IsString()
  @MinLength(8)
  idempotencyKey!: string;

  @ApiProperty({ example: '23566000002' })
  @IsString()
  toAccountNumber!: string;

  @ApiProperty({ example: '10000.00' })
  @Matches(/^\d+(\.\d{1,2})?$/, { message: 'Montant : décimales max 2' })
  amountMinor!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

export class CashInDto {
  @ApiProperty({ example: 'cmd-002' })
  @IsString()
  @MinLength(8)
  idempotencyKey!: string;

  @ApiProperty({ example: '+23566000001' })
  @Matches(/^\+235\d{8}$/)
  clientPhone!: string;

  @ApiProperty({ example: '25000.00' })
  @Matches(/^\d+(\.\d{1,2})?$/)
  amountMinor!: string;
}

export class ConfirmCashInDto {
  @ApiProperty()
  @IsString()
  transactionId!: string;

  @ApiProperty({ example: '+23566000001' })
  @Matches(/^\+235\d{8}$/)
  clientPhone!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  otp!: string;
}

export class CashOutDto {
  @ApiProperty({ example: 'cmd-003' })
  @IsString()
  @MinLength(8)
  idempotencyKey!: string;

  @ApiProperty({ example: '+23566000001' })
  @Matches(/^\+235\d{8}$/)
  clientPhone!: string;

  @ApiProperty({ example: '10000.00' })
  @Matches(/^\d+(\.\d{1,2})?$/)
  amountMinor!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  otp!: string;
}

export class ReverseDto {
  @ApiProperty({ example: 'Erreur opérateur' })
  @IsString()
  @MinLength(3)
  reason!: string;
}
