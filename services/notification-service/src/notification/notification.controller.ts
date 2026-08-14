import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { NotificationService, NotificationChannel } from './notification.service';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notifications: NotificationService) {}

  @Post()
  @ApiOperation({ summary: 'Envoie une notification (canal simulé en dev)' })
  send(
    @Body()
    dto: {
      userId: string;
      channel: NotificationChannel;
      to: string;
      title: string;
      body: string;
    },
  ) {
    return this.notifications.send(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Liste des notifications (filtre par utilisateur)' })
  list(@Query('userId') userId?: string) {
    return this.notifications.list(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail + statut (PENDING/SENT/FAILED/DLQ)' })
  get(@Param('id') id: string) {
    return this.notifications.get(id);
  }
}
