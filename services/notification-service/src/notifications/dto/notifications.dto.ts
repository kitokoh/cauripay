import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { NotificationChannel, NotificationStatus } from '../../prisma/client';

/** POST /notifications/test — envoie une notification de test (type SYSTEM). */
export class SendTestNotificationDto {
  @ApiProperty({ example: 'uuid-user', description: 'Utilisateur destinataire' })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ enum: NotificationChannel, example: NotificationChannel.SMS })
  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;
}

/** GET /notifications?userId=&status= */
export class ListNotificationsQueryDto {
  @ApiPropertyOptional({ example: 'uuid-user', description: 'Filtre par utilisateur' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ enum: NotificationStatus, description: 'Filtre par statut' })
  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;
}
