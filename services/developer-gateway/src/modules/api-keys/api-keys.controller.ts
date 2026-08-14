import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/guards/jwt-auth.guard';

/**
 * Gestion des clés API (GOURSI-050a) — réservée aux utilisateurs authentifiés
 * par JWT (portail développeur). Les routes d'appel (webhooks, sandbox) sont,
 * elles, protégées par ApiKeyGuard.
 */
@ApiTags('dev/api-keys')
@ApiBearerAuth()
@Controller('dev/api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeys: ApiKeysService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateApiKeyDto) {
    return this.apiKeys.create(user.sub, dto.name);
  }

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.apiKeys.list(user.sub);
  }

  @Post(':id/revoke')
  revoke(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.apiKeys.revoke(user.sub, id);
  }

  @Post(':id/rotate')
  rotate(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.apiKeys.rotate(user.sub, id);
  }
}
