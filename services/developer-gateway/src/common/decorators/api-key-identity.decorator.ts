import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ApiKeyRequest } from '../guards/api-key.guard';

/** @ApiKeyIdentity() — identité clé API ({ apiKeyId, mode, ownerUserId }) posée par ApiKeyGuard. */
export const ApiKeyIdentity = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<ApiKeyRequest>();
    return request.apiKey;
  },
);
