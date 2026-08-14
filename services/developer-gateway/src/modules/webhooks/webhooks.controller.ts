import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { Public } from '../../common/decorators/public.decorator';
import { ApiKeyGuard, ApiKeyIdentity as ApiKeyIdentityT } from '../../common/guards/api-key.guard';
import { ApiKeyIdentity } from '../../common/decorators/api-key-identity.decorator';

/**
 * Configuration des webhooks sortants (GOURSI-050c) — routes développeur
 * publiques, protégées par clé API (ApiKeyGuard) au lieu du JWT.
 */
@ApiTags('dev/webhooks')
@ApiBearerAuth()
@Public()
@UseGuards(ApiKeyGuard)
@Controller('dev/webhooks')
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Post()
  create(@ApiKeyIdentity() apiKey: ApiKeyIdentityT, @Body() dto: CreateWebhookDto) {
    return this.webhooks.create(apiKey.apiKeyId, dto);
  }

  @Get()
  list(@ApiKeyIdentity() apiKey: ApiKeyIdentityT) {
    return this.webhooks.list(apiKey.apiKeyId);
  }

  @Get(':id')
  get(@ApiKeyIdentity() apiKey: ApiKeyIdentityT, @Param('id') id: string) {
    return this.webhooks.get(apiKey.apiKeyId, id);
  }

  @Patch(':id')
  update(@ApiKeyIdentity() apiKey: ApiKeyIdentityT, @Param('id') id: string, @Body() dto: UpdateWebhookDto) {
    return this.webhooks.update(apiKey.apiKeyId, id, dto);
  }

  @Delete(':id')
  remove(@ApiKeyIdentity() apiKey: ApiKeyIdentityT, @Param('id') id: string) {
    return this.webhooks.remove(apiKey.apiKeyId, id);
  }
}
