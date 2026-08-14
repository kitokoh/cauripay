import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { ListNotificationsQueryDto, SendTestNotificationDto } from './dto/notifications.dto';
import { ServiceKeyGuard } from '../common/guards/service-key.guard';

/**
 * Routes internes (GOURSI-026a) : protégées par X-Service-Key
 * (ou Bearer JWT Keycloak en alternative) — jamais exposées au public.
 */
@ApiTags('notifications')
@ApiBearerAuth()
@ApiSecurity('X-Service-Key')
@UseGuards(ServiceKeyGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des notifications (filtres userId, status)' })
  list(@Query() query: ListNotificationsQueryDto) {
    return this.notifications.list(query.userId, query.status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d’une notification' })
  findOne(@Param('id') id: string) {
    return this.notifications.findOne(id);
  }

  @Post('test')
  @ApiOperation({ summary: 'Envoie une notification de test sur un canal donné' })
  sendTest(@Body() dto: SendTestNotificationDto) {
    return this.notifications.sendTest(dto);
  }
}
