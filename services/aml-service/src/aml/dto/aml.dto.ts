import { IsEnum, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { AlertSeverity, AlertStatus } from '@prisma/client';

export class AlertsQuery {
  @IsOptional() @IsEnum(AlertStatus) status?: AlertStatus;
  @IsOptional() @IsEnum(AlertSeverity) severity?: AlertSeverity;
  @IsOptional() @IsString() page?: string;
}

export class AlertActionDto {
  @IsIn(['review', 'confirm', 'false_positive'])
  action!: 'review' | 'confirm' | 'false_positive';

  @IsString() @IsNotEmpty() @MaxLength(500)
  comment!: string;
}
